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
import type { Courseware, ArticleAnnotation, AIWordAnalysis } from './types';
import {
  getSavedCoursewares,
  saveCoursewareToStorage,
  getActiveCoursewareId,
  setActiveCoursewareId,
} from './utils/coursewareStorage';
import { countUnsolvedQuestions } from './utils/aiSolveService';
import { exportCoursewareToHTML } from './utils/htmlExporter';
import { ArticleAnnotationModal, DEFAULT_HIGHLIGHT_COLOR } from './components/ArticleAnnotationModal';
import { findExactOffset, extractSentenceContext } from './utils/textSelectionUtils';

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
    selectOption,
    submitAnswers,
    resetAnswers,
    toggleBlankReveal,
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

  const handleSaveAnnotation = useCallback(
    (
      data: {
        text: string;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        color: string;
        note: string;
        aiAnalysis?: AIWordAnalysis;
      },
      existingId?: string
    ) => {
      if (!state.courseware) return;

      const currentAnnots = state.courseware.annotations || [];
      let updatedAnnots: ArticleAnnotation[];

      if (existingId) {
        updatedAnnots = currentAnnots.map((a) =>
          a.id === existingId
            ? { ...a, ...data, updatedAt: Date.now() }
            : a
        );
      } else {
        const newAnnot: ArticleAnnotation = {
          ...data,
          id: `annot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        updatedAnnots = [...currentAnnots, newAnnot];
      }

      const updatedCw: Courseware = {
        ...state.courseware,
        annotations: updatedAnnots,
        updatedAt: Date.now(),
      };

      setCourseware(updatedCw);
      saveCoursewareToStorage(updatedCw);
    },
    [state.courseware, setCourseware]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      if (!state.courseware) return;

      const currentAnnots = state.courseware.annotations || [];
      const updatedAnnots = currentAnnots.filter((a) => a.id !== id);

      const updatedCw: Courseware = {
        ...state.courseware,
        annotations: updatedAnnots,
        updatedAt: Date.now(),
      };

      setCourseware(updatedCw);
      saveCoursewareToStorage(updatedCw);
    },
    [state.courseware, setCourseware]
  );

  // Global Text Selection Bubble State
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleState, setBubbleState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    contextSentence: string;
    paragraphText: string;
    isArticle: boolean;
    anchorRect?: { top: number; right: number; bottom: number; left: number; width?: number; height?: number };
  }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    paragraphIndex: -1,
    startOffset: -1,
    endOffset: -1,
    contextSentence: '',
    paragraphText: '',
    isArticle: false,
  });

  // Global Annotation & AI Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    targetText: string;
    contextSentence: string;
    paragraphText: string;
    passageTitle: string;
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    initialMode: 'note' | 'ai' | 'translate';
    existingAnnotation: ArticleAnnotation | null;
    anchorRect?: { top: number; right: number; bottom: number; left: number; width?: number; height?: number } | null;
  }>({
    isOpen: false,
    targetText: '',
    contextSentence: '',
    paragraphText: '',
    passageTitle: '',
    paragraphIndex: -1,
    startOffset: -1,
    endOffset: -1,
    initialMode: 'note',
    existingAnnotation: null,
    anchorRect: null,
  });

  const handleQuickHighlight = useCallback((color: string = DEFAULT_HIGHLIGHT_COLOR) => {
    if (bubbleState.text) {
      handleSaveAnnotation({
        text: bubbleState.text,
        paragraphIndex: bubbleState.paragraphIndex,
        startOffset: bubbleState.startOffset,
        endOffset: bubbleState.endOffset,
        color,
        note: '',
      });
    }
    setBubbleState((prev) => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  }, [bubbleState, handleSaveAnnotation]);

  const handleOpenNoteModal = useCallback(() => {
    setModalState({
      isOpen: true,
      targetText: bubbleState.text,
      contextSentence: bubbleState.contextSentence,
      paragraphText: bubbleState.paragraphText,
      passageTitle: state.courseware?.title || '',
      paragraphIndex: bubbleState.paragraphIndex,
      startOffset: bubbleState.startOffset,
      endOffset: bubbleState.endOffset,
      initialMode: 'note',
      existingAnnotation: null,
      anchorRect: bubbleState.anchorRect || null,
    });
    setBubbleState((prev) => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  }, [bubbleState, state.courseware]);

  const handleOpenAIModal = useCallback(() => {
    setModalState({
      isOpen: true,
      targetText: bubbleState.text,
      contextSentence: bubbleState.contextSentence,
      paragraphText: bubbleState.paragraphText,
      passageTitle: state.courseware?.title || '',
      paragraphIndex: bubbleState.paragraphIndex,
      startOffset: bubbleState.startOffset,
      endOffset: bubbleState.endOffset,
      initialMode: 'ai',
      existingAnnotation: null,
      anchorRect: bubbleState.anchorRect || null,
    });
    setBubbleState((prev) => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  }, [bubbleState, state.courseware]);

  const handleOpenTranslateModal = useCallback(() => {
    setModalState({
      isOpen: true,
      targetText: bubbleState.text,
      contextSentence: bubbleState.contextSentence,
      paragraphText: bubbleState.paragraphText,
      passageTitle: state.courseware?.title || '',
      paragraphIndex: bubbleState.paragraphIndex,
      startOffset: bubbleState.startOffset,
      endOffset: bubbleState.endOffset,
      initialMode: 'translate',
      existingAnnotation: null,
      anchorRect: bubbleState.anchorRect || null,
    });
    setBubbleState((prev) => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  }, [bubbleState, state.courseware]);

  const handleOpenExistingAnnotation = useCallback((annot: ArticleAnnotation, anchorRect?: DOMRect) => {
    if (!state.courseware) return;
    const pText = annot.paragraphIndex >= 0 ? (state.courseware.paragraphs[annot.paragraphIndex] || '') : '';
    const contextSentence = pText
      ? extractSentenceContext(pText, Math.max(0, annot.startOffset), Math.max(0, annot.endOffset))
      : annot.text;

    let mode: 'note' | 'ai' | 'translate' = 'note';
    if (annot.aiTranslation && !annot.aiAnalysis) {
      mode = 'translate';
    } else if (annot.aiAnalysis) {
      mode = 'ai';
    }

    setModalState({
      isOpen: true,
      targetText: annot.text,
      contextSentence,
      paragraphText: pText,
      passageTitle: state.courseware.title,
      paragraphIndex: annot.paragraphIndex,
      startOffset: annot.startOffset,
      endOffset: annot.endOffset,
      initialMode: mode,
      existingAnnotation: annot,
      anchorRect: anchorRect ? {
        top: anchorRect.top,
        right: anchorRect.right,
        bottom: anchorRect.bottom,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height,
      } : null,
    });
  }, [state.courseware]);

  // Global mouseup and selection listener across entire workspace
  useEffect(() => {
    const handleWorkspaceMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.annotation-modal-container') ||
        target.closest('.annotation-bubble-container')
      ) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length > 300) {
          return;
        }

        const range = selection.getRangeAt(0);
        if (!mainWorkspaceRef.current || !mainWorkspaceRef.current.contains(range.commonAncestorContainer)) {
          return;
        }

        // Check if inside article paragraph (both standard and cloze paragraphs have data-paragraph-index)
        let node: Node | null = range.commonAncestorContainer;
        let paragraphEl: HTMLElement | null = null;
        while (node && node !== mainWorkspaceRef.current) {
          if (node instanceof HTMLElement && node.hasAttribute('data-paragraph-index')) {
            paragraphEl = node;
            break;
          }
          node = node.parentNode;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        if (!paragraphEl || !state.courseware) {
          return;
        }

        const pIdx = parseInt(paragraphEl.getAttribute('data-paragraph-index') || '-1', 10);
        if (pIdx < 0 || pIdx >= state.courseware.paragraphs.length) {
          return;
        }

        const originalParagraphText = state.courseware.paragraphs[pIdx];

        const preRange = document.createRange();
        preRange.selectNodeContents(paragraphEl);
        preRange.setEnd(range.startContainer, range.startOffset);
        const approxOffset = preRange.toString().length;

        const { start, end } = findExactOffset(originalParagraphText, selectedText, approxOffset);
        if (start === -1) return;

        const contextSentence = extractSentenceContext(originalParagraphText, start, end);
        setBubbleState({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          text: selectedText,
          paragraphIndex: pIdx,
          startOffset: start,
          endOffset: end,
          contextSentence,
          paragraphText: originalParagraphText,
          isArticle: true,
          anchorRect: {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
      }, 50);
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current && bubbleRef.current.contains(e.target as Node)) {
        return;
      }
      setBubbleState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    document.addEventListener('mouseup', handleWorkspaceMouseUp);
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleWorkspaceMouseUp);
      document.removeEventListener('mousedown', handleGlobalMouseDown);
    };
  }, [state.courseware]);

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

  const handleToggleCoursewareType = useCallback(
    (newType: 'reading' | 'cloze') => {
      if (!state.courseware) return;
      const updatedCw: Courseware = {
        ...state.courseware,
        coursewareType: newType,
        questions: state.courseware.questions.map((q) => ({
          ...q,
          type: newType === 'cloze' ? ('cloze' as const) : ('single' as const),
        })),
        updatedAt: Date.now(),
      };
      setCourseware(updatedCw);
      saveCoursewareToStorage(updatedCw);
    },
    [state.courseware, setCourseware]
  );

  return (
    <div className="h-screen flex flex-col bg-[#f4efe6] overflow-hidden">
      {/* Top Professional Toolbar */}
      <Toolbar
        title={state.courseware.title}
        subtitle={state.courseware.subtitle}
        coursewareType={state.courseware.coursewareType}
        onToggleCoursewareType={handleToggleCoursewareType}
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
        className={`flex-1 flex overflow-hidden relative p-2.5 md:p-3.5 gap-1.5 bg-[#f4efe6] ${
          isDraggingSplitter ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* Left: Article Panel Card */}
        <section
          className="flex-none h-full overflow-hidden flex flex-col"
          style={{ width: `calc(${splitPercent}% - 6px)` }}
          aria-label="文章精读区"
        >
          <div className="h-full flex flex-col bg-white rounded-2xl shadow-xs border border-[#e8e2d6] overflow-hidden">
            <ArticlePanel
              ref={articleRef}
              courseware={state.courseware}
              fontSize={state.fontSize}
              areAnswersShown={state.areAnswersShown}
              activeQuestionId={state.activeQuestionId}
              userAnswers={state.userAnswers}
              isSubmitted={state.isSubmitted}
              revealedBlanks={state.revealedBlanks}
              onEvidenceClick={handleEvidenceClick}
              onBlankClick={(blankId) => {
                toggleBlankReveal(blankId);
                handleEvidenceClick(blankId);
              }}
              onSaveAnnotation={handleSaveAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onOpenAnnotation={handleOpenExistingAnnotation}
            />
          </div>
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
          className={`group relative flex-none w-2 cursor-col-resize flex items-center justify-center transition-all z-20 my-auto h-28 hover:bg-[#e4ddd0] rounded-full mx-0.5 ${
            isDraggingSplitter ? 'bg-[#ea580c]/20' : ''
          }`}
        >
          {/* Visual Grip Handle */}
          <div
            className={`w-1 h-8 rounded-full transition-all ${
              isDraggingSplitter
                ? 'bg-[#ea580c] scale-y-125'
                : 'bg-stone-300 group-hover:bg-[#ea580c]'
            }`}
          />

          {/* Floating Ratio Tooltip Badge */}
          {isDraggingSplitter && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white text-[11px] font-mono font-bold shadow-lg whitespace-nowrap animate-fadeIn">
              {Math.round(splitPercent)}% : {Math.round(100 - splitPercent)}%
            </div>
          )}
        </div>

        {/* Right: Question Panel Card */}
        <section
          className="flex-1 h-full overflow-hidden flex flex-col min-w-0"
          style={{ width: `calc(${100 - splitPercent}% - 6px)` }}
          aria-label="题目与解析区"
        >
          <div className="h-full flex flex-col bg-white rounded-2xl shadow-xs border border-[#e8e2d6] overflow-hidden">
            <QuestionPanel
              ref={questionRef}
              questions={state.courseware.questions}
              summaryGroup={state.courseware.summaryGroup}
              coursewareType={state.courseware.coursewareType}
              paragraphs={state.courseware.paragraphs}
              activeQuestionId={state.activeQuestionId}
              showAnswers={state.showAnswers}
              areAnswersShown={state.areAnswersShown}
              fontSize={state.fontSize}
              userAnswers={state.userAnswers}
              isSubmitted={state.isSubmitted}
              onQuestionClick={handleQuestionClick}
              onToggleAnswer={toggleAnswer}
              onSelectOption={selectOption}
              onSubmitAnswers={submitAnswers}
              onResetAnswers={resetAnswers}
              onAISolve={() => setShowAISolve(true)}
            />
          </div>
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

      {/* Global Floating Selection Bubble */}
      {bubbleState.visible && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            left: `${Math.max(160, Math.min(window.innerWidth - 160, bubbleState.x))}px`,
            top: `${Math.max(60, bubbleState.y)}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 60,
          }}
          className="annotation-bubble-container flex items-center gap-1.5 p-1.5 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md animate-scaleIn pointer-events-auto select-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Action: Direct Yellow Highlight */}
          <button
            type="button"
            onClick={() => handleQuickHighlight(DEFAULT_HIGHLIGHT_COLOR)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/30 rounded-lg transition-all shadow-xs cursor-pointer"
            title="一键添加黄色高亮标记"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-xs inline-block"></span>
            <span>高亮</span>
          </button>

          {/* Action: Write Note */}
          <button
            type="button"
            onClick={handleOpenNoteModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <span>📝</span>
            <span>写笔记</span>
          </button>

          {/* Action: Lexicon Explanation */}
          <button
            type="button"
            onClick={handleOpenAIModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/70 hover:bg-indigo-600 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <span>📖</span>
            <span>释义</span>
          </button>

          {/* Action: Translation */}
          <button
            type="button"
            onClick={handleOpenTranslateModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-600/70 hover:bg-emerald-600 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <span>🌐</span>
            <span>翻译</span>
          </button>

          {/* Close / Dismiss */}
          <button
            type="button"
            onClick={() => setBubbleState((prev) => ({ ...prev, visible: false }))}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-200 text-sm ml-0.5 rounded-full hover:bg-slate-800 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Global Article Annotation & AI Modal */}
      <ArticleAnnotationModal
        isOpen={modalState.isOpen}
        targetText={modalState.targetText}
        contextSentence={modalState.contextSentence}
        paragraphText={modalState.paragraphText}
        passageTitle={modalState.passageTitle}
        paragraphIndex={modalState.paragraphIndex}
        startOffset={modalState.startOffset}
        endOffset={modalState.endOffset}
        initialMode={modalState.initialMode}
        existingAnnotation={modalState.existingAnnotation}
        anchorRect={modalState.anchorRect}
        onSave={(data, id) => {
          handleSaveAnnotation(data, id);
        }}
        onDelete={(id) => {
          handleDeleteAnnotation(id);
        }}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App;
