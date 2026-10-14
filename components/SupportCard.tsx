'use client';

// De vragen uit de klantenservice van de retailer, naast de meting.
//
// Ze zijn geen onderdeel van de vragenbank en tellen niet in de score. Per vraag
// staat waar het antwoord vandaan komt: uit de catalogus (een bankvraag die
// hetzelfde vraagt, met hoeveel producten hem beantwoorden), of van de website
// (de sitetoets). Het aantal mails staat erbij, zodat hij ziet waar zijn klanten
// werkelijk mee zitten. Zie `src/questions/support.ts`.

import type { SiteAnswer, SiteCheck } from '../src/collect/answers';
import { isStockQuestion } from '../src/collect/answers';
import type { Strings } from '../src/i18n/strings';
import type { SupportList, SupportQuestion } from '../src/questions/support';
import type { ReportModel } from '../src/report/model';
import { AnswerDetail, STATUS_TONE } from './AdvisoryCard';
import { Badge, Card, CardTitle } from './ui';

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

export function SupportCard({ s, model, support, siteCheck, pending }: {
  s: Strings;
  model: ReportModel;
  support?: SupportList;
  siteCheck?: SiteCheck;
  /** De sitetoets loopt nog. */
  pending?: boolean;
}) {
  // Voorraad laten we weg, zoals overal in het rapport.
  const questions = (support?.questions ?? []).filter((question) => !isStockQuestion(question.question));
  if (questions.length === 0) return null;

  const answerOf = new Map((siteCheck?.answers ?? []).map((answer) => [answer.questionId, answer]));

  /** Hoeveel producten de bankvraag beantwoorden, over alle sets waar hij speelt. */
  function share(questionId: string): { answered: number; applicable: number } | undefined {
    const rows = model.bankQuestions?.filter((row) => row.questionId === questionId)
      ?? model.questions?.filter((row) => row.questionId === questionId);
    if (!rows || rows.length === 0) return undefined;
    return rows.reduce((sum, row) => ({ answered: sum.answered + row.answered, applicable: sum.applicable + row.applicable }), { answered: 0, applicable: 0 });
  }

  // Op thema, in de volgorde van zijn bestand.
  const themes = [...new Set(questions.map((question) => question.theme ?? ''))];

  return (
    <Card>
      <CardTitle sub={s.report.supportIntro.replace('{bestand}', support?.name ?? '')}>{s.report.supportHeading}</CardTitle>
      <div className="space-y-4">
        {themes.map((theme) => (
          <div key={theme || '-'}>
            {theme ? <h4 className="text-sm font-medium">{theme}</h4> : null}
            <ul className="mt-1 space-y-2">
              {questions.filter((question) => (question.theme ?? '') === theme).map((question) => (
                <SupportRow
                  key={question.id}
                  s={s}
                  question={question}
                  share={question.match?.scored ? share(question.match.questionId) : undefined}
                  answer={answerOf.get(question.match && !question.match.scored ? question.match.questionId : question.id)}
                  checked={siteCheck !== undefined}
                  pending={pending === true}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SupportRow({ s, question, share, answer, checked, pending }: {
  s: Strings;
  question: SupportQuestion;
  share?: { answered: number; applicable: number };
  answer?: SiteAnswer;
  checked: boolean;
  pending: boolean;
}) {
  const mails = question.count === undefined
    ? undefined
    : question.group
      ? s.report.supportGroupMails.replace('{groep}', question.group).replace('{aantal}', n(question.count))
      : s.report.supportMails.replace('{aantal}', n(question.count));
  const fromCatalog = question.match?.scored === true;

  return (
    <li className="border-t border-line pt-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 text-sm">{question.question}</span>
        {!fromCatalog && answer ? <Badge tone={STATUS_TONE[answer.status]}>{s.report.siteStatus[answer.status]}</Badge> : null}
      </div>
      <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
        {mails ? <span className="tnum">{mails}</span> : null}
        {question.match ? (
          <span>
            {fromCatalog ? s.report.supportInBank : s.report.supportInBankAdvisory}{' '}
            <span className="text-ink">{question.match.label}</span>
          </span>
        ) : (
          <span>{s.report.supportNotInBank}</span>
        )}
      </p>
      {fromCatalog ? (
        share && share.applicable > 0 ? (
          <p className="mt-0.5 text-xs text-muted tnum">
            {s.report.supportShare.replace('{beantwoord}', n(share.answered)).replace('{totaal}', n(share.applicable))}
          </p>
        ) : null
      ) : answer ? (
        <AnswerDetail s={s} answer={answer} />
      ) : (
        <p className="mt-0.5 text-xs text-muted">{pending ? s.report.supportChecking : checked ? s.report.supportNotChecked : s.report.supportNoCheck}</p>
      )}
    </li>
  );
}
