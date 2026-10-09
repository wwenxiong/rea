import { useState, useRef, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { ArticlePanel } from './components/ArticlePanel';
import type { ArticlePanelHandle } from './components/ArticlePanel';
import { QuestionPanel } from './components/QuestionPanel';
import type { QuestionPanelHandle } from './components/QuestionPanel';
import { ImportDialog } from './components/ImportDialog';
import { SettingsModal } from './components/SettingsModal';
import { CoursewareLibraryModal } from './components/CoursewareLibraryModal';
import { AISolveModal } from './components/AISolveModal';
import { useAppState } from './hooks/useAppState';
import { sampleCourseware } from './data/sampleCourseware';
import type { Courseware } from './types';
import {
  getSavedCoursewares,
  saveCoursewareToStorage,
  getActiveCoursewareId,
  setActiveCoursewareId,
} from './utils/coursewareStorage';
import { countUnsolvedQuestions } from './utils/aiSolveService';
import { exportCoursewareToHTML } from './utils/htmlExporter';

function App() {
  const {
    state,
    setCourseware,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    setActiveQuestion,
    toggleAnswer,
    toggleAllAnswers,
  } = useAppState();

  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAISolve, setShowAISolve] = useState(false);
  const [libraryCount, setLibraryCount] = useState(1);
  const articleRef = useRef<ArticlePanelHandle>(null);
  const questionRef = useRef<QuestionPanelHandle>(null);

  // Split pane resizable width state (left percentage)
  const DEFAULT_SPLIT_PERCENT = 60;
  const [splitPercent, setSplitPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rc_workspace_split_percent');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 80) return val;
      }
    } catch {}
    return DEFAULT_SPLIT_PERCENT;
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const mainWorkspaceRef = useRef<HTMLElement>(null);

  // Handle splitter dragging
  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainWorkspaceRef.current) return;
      const rect = mainWorkspaceRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(80, Math.max(20, newPercent));
      setSplitPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      setSplitPercent((prev) => {
        try {
          localStorage.setItem('rc_workspace_split_percent', prev.toFixed(1));
        } catch {}
        return prev;
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mainWorkspaceRef.current || e.touches.length === 0) return;
      const rect = mainWorkspaceRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const newPercent = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(80, Math.max(20, newPercent));
      setSplitPercent(clamped);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Initialize with saved courseware on first render
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    const savedList = getSavedCoursewares();
    const activeId = getActiveCoursewareId();
    const target =
      (activeId && savedList.find((c) => c.id === activeId)) ||
      savedList[0] ||
      sampleCourseware;
    setCourseware(target);
    setLibraryCount(savedList.length);
    setInitialized(true);
  }

  const handleQuestionClick = useCallback(
    (questionId: number) => {
      if (state.activeQuestionId === questionId) {
        setActiveQuestion(null);
        if (state.showAnswers[questionId]) {
          toggleAnswer(questionId);
        }
      } else {
        setActiveQuestion(questionId);
        articleRef.current?.scrollToEvidence(questionId);
      }
    },
    [state.activeQuestionId, state.showAnswers, setActiveQuestion, toggleAnswer]
  );

  const handleEvidenceClick = useCallback(
    (questionId: number) => {
      if (state.activeQuestionId === questionId) {
        setActiveQuestion(null);
        if (state.showAnswers[questionId]) {
          toggleAnswer(questionId);
        }
      } else {
        setActiveQuestion(questionId);
        questionRef.current?.scrollToQuestion(questionId);
      }
    },
    [state.activeQuestionId, state.showAnswers, setActiveQuestion, toggleAnswer]
  );

  const handleImport = useCallback(
    (courseware: Courseware) => {
      const updated = saveCoursewareToStorage(courseware);
      setCourseware(courseware);
      setLibraryCount(updated.length);
      setActiveCoursewareId(courseware.id);
    },
    [setCourseware]
  );

  const handleSelectCourseware = useCallback(
    (courseware: Courseware) => {
      setCourseware(courseware);
      setActiveCoursewareId(courseware.id);
    },
    [setCourseware]
  );

  const handleAISolveSuccess = useCallback(
    (updatedCourseware: Courseware) => {
      setCourseware(updatedCourseware);
      const updatedList = saveCoursewareToStorage(updatedCourseware);
      setLibraryCount(updatedList.length);
      setActiveCoursewareId(updatedCourseware.id);
    },
    [setCourseware]
  );

  const handleExport = useCallback(() => {
    if (state.courseware) {
      exportCoursewareToHTML(state.courseware, state.fontSize);
    }
  }, [state.courseware, state.fontSize]);

  const unsolvedCount = state.courseware
    ? countUnsolvedQuestions(state.courseware).unsolved
    : 0;

  if (!state.courseware) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 max-w-md p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-xs">
            RC
          </div>
          <h1 className="text-xl font-bold text-slate-800">雅思阅读精读课件系统</h1>
          <p className="text-slate-500 text-xs leading-relaxed">
            双栏交互式精读课件，支持试卷导入、原文定位与静态课件导出。
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              导入试卷
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              课件库 ({libraryCount})
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              设置
            </button>
          </div>
        </div>
        <ImportDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          onOpenSettings={() => setShowSettings(true)}
        />
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <CoursewareLibraryModal
          isOpen={showLibrary}
          currentCourseware={state.courseware}
          onClose={() => {
            setShowLibrary(false);
            setLibraryCount(getSavedCoursewares().length);
          }}
          onSelectCourseware={handleSelectCourseware}
          onOpenImport={() => setShowImport(true)}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Professional Toolbar */}
      <Toolbar
        title={state.courseware.title}
        subtitle={state.courseware.subtitle}
        fontSize={state.fontSize}
        areAnswersShown={state.areAnswersShown}
        libraryCount={libraryCount}
        unsolvedCount={unsolvedCount}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onSetFontSize={setFontSize}
        onToggleAllAnswers={toggleAllAnswers}
        onImport={() => setShowImport(true)}
        onExport={handleExport}
        onOpenLibrary={() => setShowLibrary(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Dual-Column Workspace with Draggable Divider */}
      <main
        ref={mainWorkspaceRef}
        className={`flex-1 flex overflow-hidden relative ${
          isDraggingSplitter ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* Left: Article Panel */}
        <section
          className="flex-none h-full overflow-hidden"
          style={{ width: `${splitPercent}%` }}
          aria-label="文章精读区"
        >
          <ArticlePanel
            ref={articleRef}
            courseware={state.courseware}
            fontSize={state.fontSize}
            areAnswersShown={state.areAnswersShown}
            activeQuestionId={state.activeQuestionId}
            onEvidenceClick={handleEvidenceClick}
          />
        </section>

        {/* Resizable Divider Bar */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSplitter(true);
          }}
          onTouchStart={() => setIsDraggingSplitter(true)}
          onDoubleClick={() => {
            setSplitPercent(DEFAULT_SPLIT_PERCENT);
            try {
              localStorage.setItem('rc_workspace_split_percent', String(DEFAULT_SPLIT_PERCENT));
            } catch {}
          }}
          title="按住左右拖拽调整正文与习题比例，双击恢复默认比例"
          className={`group relative flex-none w-2.5 cursor-col-resize flex items-center justify-center transition-colors z-20 border-x border-slate-200/80 ${
            isDraggingSplitter
              ? 'bg-indigo-500/90'
              : 'bg-slate-100 hover:bg-indigo-400'
          }`}
        >
          {/* Visual Grip Handle */}
          <div
            className={`w-1 h-9 rounded-full transition-all ${
              isDraggingSplitter
                ? 'bg-white shadow-xs scale-y-125'
                : 'bg-slate-400/70 group-hover:bg-white group-hover:scale-y-110'
            }`}
          />

          {/* Floating Ratio Tooltip Badge */}
          {isDraggingSplitter && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white text-[11px] font-mono font-bold shadow-lg whitespace-nowrap animate-fadeIn">
              {Math.round(splitPercent)}% : {Math.round(100 - splitPercent)}%
            </div>
          )}
        </div>

        {/* Right: Question Panel */}
        <section
          className="flex-1 h-full overflow-hidden"
          style={{ width: `${100 - splitPercent}%` }}
          aria-label="题目与解析区"
        >
          <QuestionPanel
            ref={questionRef}
            questions={state.courseware.questions}
            summaryGroup={state.courseware.summaryGroup}
            activeQuestionId={state.activeQuestionId}
            showAnswers={state.showAnswers}
            areAnswersShown={state.areAnswersShown}
            fontSize={state.fontSize}
            onQuestionClick={handleQuestionClick}
            onToggleAnswer={toggleAnswer}
            onAISolve={() => setShowAISolve(true)}
          />
        </section>
      </main>

      {/* AI Solve Modal */}
      <AISolveModal
        isOpen={showAISolve}
        onClose={() => setShowAISolve(false)}
        courseware={state.courseware}
        onSuccess={handleAISolveSuccess}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Courseware Library Modal */}
      <CoursewareLibraryModal
        isOpen={showLibrary}
        currentCourseware={state.courseware}
        onClose={() => {
          setShowLibrary(false);
          setLibraryCount(getSavedCoursewares().length);
        }}
        onSelectCourseware={handleSelectCourseware}
        onOpenImport={() => setShowImport(true)}
      />
    </div>
  );
}

export default App;
