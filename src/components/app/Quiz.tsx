'use client'
import { useState } from 'react'
import { CULTURES, type Culture, type Tag } from '@/lib/model'
import { getState, setState, EMPTY_FILTERS, type Quiz as QuizAnswers } from '@/lib/store'
import { track } from '@/lib/sync'
import { t } from '@/lib/t'
import type { Ctx } from './types'

const STYLE_TAGS: Tag[] = ['classic', 'modern', 'vintage', 'trendy', 'nature', 'biblical', 'mythology', 'royal', 'literary', 'sweet', 'strong', 'celestial']
const STEPS = 6

/** The opening questions. Gender and origin become filters; style, length and popularity only bias the order. */
export function Quiz({ ctx, onDone }: { ctx: Ctx; onDone: () => void }) {
  const { d, labels, nativeCultures } = ctx
  const q = d.quiz
  const prev = getState()
  const [step, setStep] = useState(prev.quiz ? 1 : 0)
  const [a, setA] = useState<QuizAnswers>(prev.quiz || { gender: 'any', styles: [], origin: 'mine', length: 'any', pop: 'any' })
  const [picked, setPicked] = useState<Culture[]>(prev.filters.cultures)
  const [surname, setSurname] = useState(prev.surname)

  function finish() {
    setState({
      quiz: a, quizSkipped: false, surname: surname.trim().slice(0, 40),
      filters: {
        ...EMPTY_FILTERS,
        g: a.gender === 'f' ? ['f', 'u'] : a.gender === 'm' ? ['m', 'u'] : [],
        nativeOnly: a.origin === 'mine',
        cultures: a.origin === 'pick' ? picked : [],
      },
    })
    track('quiz_done', true)
    onDone()
  }
  const next = () => (step >= STEPS ? finish() : setStep(step + 1))

  if (step === 0) {
    return (
      <div className="quiz">
        <div className="welcome">
          <img src="/logo.png" alt="" width={96} height={96} />
          <h1>{q.welcomeH}</h1>
          <p className="lead">{q.welcomeP}</p>
        </div>
        <div className="quiz-foot">
          <button type="button" className="btn" onClick={() => { setState({ quizSkipped: true }); track('quiz_skip', true); onDone() }}>{q.skip}</button>
          <button type="button" className="btn btn--primary" onClick={() => { track('quiz_start', true); setStep(1) }}>{q.start}</button>
        </div>
      </div>
    )
  }

  const Opt = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button type="button" className="opt" aria-pressed={on} onClick={onClick}>{label}</button>
  )
  const single = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K], label: string) => (
    <Opt on={a[key] === value} label={label} onClick={() => { setA({ ...a, [key]: value }); if (!(key === 'origin' && value === 'pick')) setStep(step + 1) }} />
  )
  const others = (CULTURES.filter(c => c !== 'intl') as Culture[])
    .sort((x, y) => (nativeCultures.includes(y) ? 1 : 0) - (nativeCultures.includes(x) ? 1 : 0) || labels.cultures[x].localeCompare(labels.cultures[y]))

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span className="muted">{t(q.step, { i: step, n: STEPS })}</span>
        <div className="quiz-bar" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS} aria-valuenow={step}><i style={{ ['--p' as string]: step / STEPS }} /></div>
      </div>

      {step === 1 && (<>
        <h1>{q.genderQ}</h1>
        <div className="quiz-body">{single('gender', 'f', q.genderF)}{single('gender', 'm', q.genderM)}{single('gender', 'any', q.genderAny)}</div>
      </>)}
      {step === 2 && (<>
        <h1>{q.styleQ}</h1>
        <div className="quiz-body">
          <p className="muted">{q.styleHint}</p>
          <div className="pills">
            {STYLE_TAGS.map(tag => (
              <button key={tag} type="button" className="pill" aria-pressed={a.styles.includes(tag)}
                onClick={() => setA({ ...a, styles: a.styles.includes(tag) ? a.styles.filter(x => x !== tag) : [...a.styles, tag] })}>{labels.tags[tag]}</button>
            ))}
          </div>
        </div>
      </>)}
      {step === 3 && (<>
        <h1>{q.originQ}</h1>
        <div className="quiz-body">
          {single('origin', 'mine', q.originMine)}{single('origin', 'all', q.originAll)}{single('origin', 'pick', q.originPick)}
          {a.origin === 'pick' ? (
            <div className="pills">
              {others.map(cu => (
                <button key={cu} type="button" className="pill" aria-pressed={picked.includes(cu)}
                  onClick={() => setPicked(picked.includes(cu) ? picked.filter(x => x !== cu) : [...picked, cu])}>{labels.cultures[cu]}</button>
              ))}
            </div>
          ) : null}
        </div>
      </>)}
      {step === 4 && (<>
        <h1>{q.lengthQ}</h1>
        <div className="quiz-body">{single('length', 'short', q.lengthShort)}{single('length', 'any', q.lengthAny)}{single('length', 'long', q.lengthLong)}</div>
      </>)}
      {step === 5 && (<>
        <h1>{q.popQ}</h1>
        <div className="quiz-body">{single('pop', 'popular', q.popPopular)}{single('pop', 'any', q.popAny)}{single('pop', 'rare', q.popRare)}</div>
      </>)}
      {step === 6 && (<>
        <h1>{q.surnameQ}</h1>
        <div className="quiz-body">
          <div className="field">
            <label htmlFor="surname">{q.surnameHint}</label>
            <input id="surname" className="input" name="family-name" autoComplete="family-name" maxLength={40} placeholder={q.surnamePh}
              value={surname} onChange={e => setSurname(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') finish() }} />
          </div>
        </div>
      </>)}

      <div className="quiz-foot">
        <button type="button" className="btn" onClick={() => setStep(step - 1)}>{ctx.c.back}</button>
        <button type="button" className="btn btn--primary" onClick={next}>{step >= STEPS ? q.finish : ctx.c.next}</button>
      </div>
    </div>
  )
}
