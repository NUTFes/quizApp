import { monitorAnswerAri, monitorAnswerNashi } from '../monitor/monitorAnswer'
import { toPhone } from './toPhone'

export const phoneAnswerAri = toPhone(monitorAnswerAri)
export const phoneAnswerNashi = toPhone(monitorAnswerNashi)
