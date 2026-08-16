const BASE = import.meta.env.VITE_API_URL

export const getState = () => request()
export const getAdminState = () => request()
export const showQuestion = () => request()
export const advanceText = () => request()
export const showAnswer = () => request()
export const reset = () => request()
export const putQuestions = () => request()
export const getQuestions = () => request()
export const getQuestion = () => request()