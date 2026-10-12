import { useReducer, useCallback } from 'react';
import type { AppState, Courseware, TeachingMode } from '../types';
import { DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE, FONT_SIZE_STEP } from '../constants/design';

type Action =
  | { type: 'SET_COURSEWARE'; payload: Courseware | null }
  | { type: 'SET_MODE'; payload: TeachingMode }
  | { type: 'SET_FONT_SIZE'; payload: number }
  | { type: 'INCREASE_FONT_SIZE' }
  | { type: 'DECREASE_FONT_SIZE' }
  | { type: 'SET_ACTIVE_QUESTION'; payload: number | null }
  | { type: 'TOGGLE_ANSWER'; payload: number }
  | { type: 'TOGGLE_ALL_ANSWERS' }
  | { type: 'SHOW_ALL_ANSWERS' }
  | { type: 'HIDE_ALL_ANSWERS' }
  | { type: 'SELECT_OPTION'; payload: { questionId: number; option: string } }
  | { type: 'SUBMIT_ANSWERS' }
  | { type: 'RESET_ANSWERS' }
  | { type: 'TOGGLE_BLANK_REVEAL'; payload: number };

const initialState: AppState = {
  courseware: null,
  currentMode: 'review',
  fontSize: DEFAULT_FONT_SIZE,
  activeQuestionId: null,
  showAnswers: {},
  areAnswersShown: false,
  userAnswers: {},
  isSubmitted: false,
  revealedBlanks: {},
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_COURSEWARE': {
      return {
        ...state,
        courseware: action.payload,
        showAnswers: {},
        areAnswersShown: false,
        activeQuestionId: null,
        userAnswers: {},
        isSubmitted: false,
        revealedBlanks: {},
      };
    }
    case 'SET_MODE': {
      const newState = { ...state, currentMode: action.payload };
      const allShown: Record<number, boolean> = {};
      state.courseware?.questions.forEach(q => { allShown[q.id] = true; });
      state.courseware?.summaryGroup?.items.forEach(it => { allShown[it.id] = true; });
      newState.showAnswers = allShown;
      newState.areAnswersShown = true;
      return newState;
    }
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, action.payload)) };
    case 'INCREASE_FONT_SIZE':
      return { ...state, fontSize: Math.min(MAX_FONT_SIZE, state.fontSize + FONT_SIZE_STEP) };
    case 'DECREASE_FONT_SIZE':
      return { ...state, fontSize: Math.max(MIN_FONT_SIZE, state.fontSize - FONT_SIZE_STEP) };
    case 'SET_ACTIVE_QUESTION':
      return { ...state, activeQuestionId: action.payload };
    case 'TOGGLE_ANSWER':
      return {
        ...state,
        showAnswers: {
          ...state.showAnswers,
          [action.payload]: !state.showAnswers[action.payload],
        },
      };
    case 'TOGGLE_ALL_ANSWERS': {
      const willShow = !state.areAnswersShown;
      if (willShow) {
        const allShown: Record<number, boolean> = {};
        const allRevealed: Record<number, boolean> = {};
        state.courseware?.questions.forEach(q => {
          allShown[q.id] = true;
          allRevealed[q.id] = true;
        });
        state.courseware?.summaryGroup?.items.forEach(it => { allShown[it.id] = true; });
        return {
          ...state,
          areAnswersShown: true,
          showAnswers: allShown,
          revealedBlanks: allRevealed,
        };
      } else {
        return {
          ...state,
          areAnswersShown: false,
          showAnswers: {},
          revealedBlanks: {},
          activeQuestionId: null,
        };
      }
    }
    case 'SHOW_ALL_ANSWERS': {
      const allShown: Record<number, boolean> = {};
      const allRevealed: Record<number, boolean> = {};
      state.courseware?.questions.forEach(q => {
        allShown[q.id] = true;
        allRevealed[q.id] = true;
      });
      state.courseware?.summaryGroup?.items.forEach(it => { allShown[it.id] = true; });
      return { ...state, areAnswersShown: true, showAnswers: allShown, revealedBlanks: allRevealed };
    }
    case 'HIDE_ALL_ANSWERS':
      return { ...state, areAnswersShown: false, showAnswers: {}, revealedBlanks: {}, activeQuestionId: null };
    case 'SELECT_OPTION': {
      if (state.isSubmitted) return state; // Locked after submitting
      const { questionId, option } = action.payload;
      const currentSelected = state.userAnswers[questionId];
      const updatedAnswers = { ...state.userAnswers };
      if (currentSelected === option) {
        delete updatedAnswers[questionId];
      } else {
        updatedAnswers[questionId] = option;
      }
      return { ...state, userAnswers: updatedAnswers };
    }
    case 'SUBMIT_ANSWERS': {
      return { ...state, isSubmitted: true };
    }
    case 'RESET_ANSWERS': {
      return { ...state, userAnswers: {}, isSubmitted: false, revealedBlanks: {} };
    }
    case 'TOGGLE_BLANK_REVEAL': {
      return {
        ...state,
        revealedBlanks: {
          ...state.revealedBlanks,
          [action.payload]: !state.revealedBlanks[action.payload],
        },
      };
    }
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setCourseware = useCallback((cw: Courseware | null) => dispatch({ type: 'SET_COURSEWARE', payload: cw }), []);
  const setMode = useCallback((mode: TeachingMode) => dispatch({ type: 'SET_MODE', payload: mode }), []);
  const setFontSize = useCallback((size: number) => dispatch({ type: 'SET_FONT_SIZE', payload: size }), []);
  const increaseFontSize = useCallback(() => dispatch({ type: 'INCREASE_FONT_SIZE' }), []);
  const decreaseFontSize = useCallback(() => dispatch({ type: 'DECREASE_FONT_SIZE' }), []);
  const setActiveQuestion = useCallback((id: number | null) => dispatch({ type: 'SET_ACTIVE_QUESTION', payload: id }), []);
  const toggleAnswer = useCallback((id: number) => dispatch({ type: 'TOGGLE_ANSWER', payload: id }), []);
  const toggleAllAnswers = useCallback(() => dispatch({ type: 'TOGGLE_ALL_ANSWERS' }), []);
  const showAllAnswers = useCallback(() => dispatch({ type: 'SHOW_ALL_ANSWERS' }), []);
  const hideAllAnswers = useCallback(() => dispatch({ type: 'HIDE_ALL_ANSWERS' }), []);
  const selectOption = useCallback((questionId: number, option: string) => dispatch({ type: 'SELECT_OPTION', payload: { questionId, option } }), []);
  const submitAnswers = useCallback(() => dispatch({ type: 'SUBMIT_ANSWERS' }), []);
  const resetAnswers = useCallback(() => dispatch({ type: 'RESET_ANSWERS' }), []);
  const toggleBlankReveal = useCallback((questionId: number) => dispatch({ type: 'TOGGLE_BLANK_REVEAL', payload: questionId }), []);

  return {
    state,
    setCourseware,
    setMode,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    setActiveQuestion,
    toggleAnswer,
    toggleAllAnswers,
    showAllAnswers,
    hideAllAnswers,
    selectOption,
    submitAnswers,
    resetAnswers,
    toggleBlankReveal,
  };
}
