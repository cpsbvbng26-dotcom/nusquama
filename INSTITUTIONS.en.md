# Institutions

> This is a work of fiction, written for fun. The institutions here are rules of the kingdom within the fiction. They are not the bodies or procedures of any real state, and they have no legal effect on anyone.

This is an English translation. The [Japanese version](INSTITUTIONS.md) governs; if the two differ, the Japanese version applies.

This page arranges the [Basic Law](founding.en.md) and the rules by how the kingdom works. Where they differ, the Basic Law and the rules apply.

## Bodies

| Body | Role | Held by |
| --- | --- | --- |
| The King | Changes the Basic Law and the rules, dubs knights, records mistakes | Nemo I, Knight-King |
| Ordo Erratorum | The knights. It has no duties | The knights on the [roll](KNIGHTS.en.md) |
| The King's errata | Records the King's mistakes. Also the domain | The King |
| Gazette | Announces events, with issue numbers | Made automatically from the timeline, the errata and the roll |
| Checks | Confirm that no commitment in the rules has gone | The check code in the repository |

All the bodies are held by the King alone.
Besides the King there are no officials, no assembly and no court.
The part of the King is played by the operator.

## Proclamations and their numbers

Events of the kingdom appear in the [Gazette](GAZETTE.en.md) with an issue number. Issues are numbered from 1, oldest first.
The number of a proclamation is the number of the gazette issue that carries it. For example, the proclamation that laid down the Basic Law and the Ten Precepts is gazette No. 1.

A proclamation is written as one row of the timeline on the top page, in this form:

- Date: the date in Japan time.
- Event: one sentence on what was laid down or done.
- English: the English translation of the event.

Errata and knightings reach the gazette from the rows of the errata and the roll. They are not written in the timeline.

Once given, an issue number is fixed in the ledger of issue numbers (`verification/gazette-numbers.json`) and is never given again. When the site is built, only new issues are added to the ledger.
A row added later on the same day gets a number after the other issues of that day.
A row added later with a past date would put the numbers out of date order, and the checks fail.

## Commemorative issues

When the number of entries in the King's errata reaches a multiple of 100, one commemorative issue appears in the gazette.
It is the issue right after the one that records that entry. The gazette makes it from the errata by itself.
No object, badge or certificate is made for it. No title is given and no day is added.
On the day of a commemorative issue, the King reads again the mistakes so far, category by category.

## Population and how people are called

The population is the number of knights of the Ordo Erratorum.
The current population and the numbers by year are in the tables of [For anyone introducing Nusquama](PRESS.en.md). The tables are counted from the roll, not written by hand.
Knights are not citizens. Nusquama gives no nationality ([Rules on Knighting](policies/knighting.en.md)).
Anyone who is not a knight is called a visitor. Visitors have nothing to register or report.
The King is not counted in the population, because the King is not on the roll.

## How decisions are made

The King decides. There are no votes and no elections.
Knights have neither the duty nor the right to take part in decisions. A knight may leave at any time.
The King's decisions are announced in the gazette or by the date of last update of a rule.

## Pardon

Nusquama has no pardon that erases a mistake (Article 5 of the Basic Law).
If a recorded entry itself turns out to be wrong, the earlier row is not erased. A new row records that the earlier row was wrong.
So asking for a pardon makes the domain one parcel larger.
Removing a knight's name from the roll is not a pardon. Leaving and revocation follow the [Rules on Knighting](policies/knighting.en.md).

## Changing the rules

The Basic Law and the rules are changed by the King, in this order:

1. Change the Japanese version, and on the same day the English translation.
2. Change the date of last update of the rule.
3. Where text is replaced or removed, keep the text before the change in the [King's errata](ERRATA.en.md) (as the opening of the errata says).
4. Add a row to the timeline, so that it appears in the gazette.
5. Publish only after the checks pass.

Articles 1, 6 and 8 of the Basic Law are not removed (Article 10).
When a change takes effect and how it is announced follow the [Terms of Use](policies/terms.en.md), "Changes and ending".

## Versions

Nusquama does not number the versions of its rules. A rule is referred to by its date.
Earlier rules can be read in the history of the public repository.

## The yearly review

Every year on 7 November (Founding Day), a review issue opens automatically. The King follows it and checks that the rules and practice still agree.

- Does every page say that this is fiction?
- Is there no way to buy a title or to give a donation?
- Has no knight's request to leave been left unanswered?
- Is the watch on the laws still running?
- Is the English translation up to date with the Japanese version?
- Is the kingdom still unconnected with the operator's other activities?

## Freezing

If the King can no longer keep the kingdom going, the kingdom is frozen. When it is frozen:

- No requests for knighthood are accepted.
- The roll, the errata and the rules stay public as they are.
- Requests for deletion, correction or leaving are answered as far as possible.

The freezing is announced by putting the "Closing words" below on the top page.
The "Notice of suspension" below is put up with them.

## Dissolution

To close the kingdom, the King follows this order:

1. Close the form for requesting knighthood.
2. Put up the closing words and announce them in the gazette.
3. Tell the knights that they may ask to leave the roll, and do so for any who ask.
4. Allow at least 30 days for such requests.
5. Do not delete the site; keep serving it as it was last. Do not delete the Vercel project, because then someone else might be able to use the name nusquama.vercel.app. Stop the watch on the live site (live.yml).
6. Do not delete the repository, and do not archive it either. Keep issues open, to receive requests for removal, correction or withdrawal, and requests about personal data held.

Personal data is handled as the [Privacy](policies/privacy.en.md) page says.

## A dry run of dissolution

On 2026-11-11 the procedure for dissolution was walked through once, without carrying it out. Nothing was stopped and nothing was deleted.
The gaps found are listed below.

| Step | What was walked through | Gap |
| --- | --- | --- |
| 1 | Close the form for requesting knighthood. | Deleting the form breaks the links to it from the README, the rules and SECURITY.md, and the check of the form's oaths fails. The checks do not know a closed kingdom. The workflow that checks applications also stays |
| 2 | Put up the closing words and announce them in the gazette. | The announcement is one row of the timeline, and its number is fixed by the ledger. The closing words address the knights, but there is no form for when there are none |
| 3 | Tell the knights that they may ask to leave the roll, and do so for any who ask. | How to tell them is not written. The roll holds only account names and application issues, so the only way is a comment on each application issue |
| 4 | Allow at least 30 days for such requests before stopping the site. | How to stop it is not written. If the Vercel project is deleted, someone else may be able to take the name nusquama.vercel.app. The Disclaimer says the site is only at this address. After the site stops, the watch on the live site (live.yml) would open an issue every day |
| 5 | Keep the repository, in a read-only state. | When a repository is archived on GitHub, no issue can be opened. The account names stay on the roll, so there is no longer a way to receive requests for removal, correction or withdrawal, or requests about personal data held |
| Other | Things that run by themselves | No step stops the watch on laws and terms, the yearly review or Dependabot |
| Other | Elsewhere | No step adds the dissolution to the MicroWiki article |
| Other | Against the rules | The Terms of Use, "Changes and ending", say that Nusquama may end without notice. How that reads beside the 30 days of dissolution is not written |
| Other | Ten years ahead | The gazette issue on the outlook in 2036 cannot appear after dissolution |

The gaps found at steps 4 and 5 were filled by the King on 2026-11-11: the site is kept and served, and the repository is not archived, so that requests can still be received (steps 4 to 6 of "Dissolution" above). The earlier text is in [the King's errata](ERRATA.en.md).
The remaining gaps are filled when a dissolution is decided, before it is carried out. Decided by Claude on 2026-11-12: each of them is a step needed only when dissolving, and none changes how the kingdom works while it is not dissolving.

## A dry run of knighting

On 2026-11-12 the path of an application for knighthood was walked through once, with a trial application. No real issue was opened.
A check (`verification/check.js`, "A dry run of knighting") builds the text of an application from the definition of the form, and walks it through to the row of the roll, the gazette issue, the population and the feed, every time the checks run.
The trial application is on neither the roll nor the gazette.
The gaps found are listed below.

| Step | What was walked through | Gap |
| --- | --- | --- |
| 1 | Build the text of the application issue from the form. | None. The headings the automatic check reads are the same as the headings of the form |
| 2 | The automatic check runs on the label the form adds. | None. The label is the one the labels workflow creates and the one the check workflow waits for |
| 3 | The automatic check looks at the ticks, the link and the explanation, and comments. | None. The link was not opened; a response status was passed in. From 2026-11-12, the automatic check does not open the link, and looks only at whether it is an https URL that does not point to a refused destination (King's errata 30) |
| 4 | The operator reads the linked page and checks it. | This is reading by a person, so the checks cannot walk it through |
| 5 | Add one row to the roll, as "How entries are recorded" says. | No check compared the rows of the English roll with the Japanese roll. One was added on 2026-11-12 (the number, the knight, the day of knighting and the application must match) |
| 6 | A gazette issue appears, and the knight enters the population and the feed. | None |
| Other | When the first real knight is entered | The check of the knights' gazette issues assumed an empty roll. Once the first knight was entered, it would have failed even for a correct row. On 2026-11-12 it was changed to check with the next number after the current roll |
| Other | The day of knighting and the order of issues | If the timeline has a row dated after the day the knighting was decided, the issues fall out of date order and the checks fail. The row of the roll has to be added on the day of the decision, but "How entries are recorded" does not say so. Decided by Claude on 2026-11-12 and written in "How entries are recorded" on the roll |
| Other | Answering the application issue | What to write on the issue on knighting, and whether to close it, is not written. Only the one sentence for a refusal is fixed. Decided by Claude on 2026-11-12 and written in "The roll" in the Rules on Knighting (a comment with a link to the row of the roll, and the issue closed as completed) |

The gap at step 5 and the gap for the first knight were filled by changing the checks.
The gaps for the day of knighting and the order of issues, and for answering the application issue, were filled by decisions Claude made on 2026-11-12.
Step 4 is reading by a person, so the checks do not walk it through.

## Closing words

This is the draft of the text put up on freezing or dissolution. It is issued with the date of that day.

The kingdom that is nowhere returns to nowhere.
The King's errata stay here. The mistakes are left behind, not erased.
Knights, thank you for correcting mistakes with us.

## Notice of suspension

This is the draft of the notice put up beside the closing words when the kingdom is frozen and its work is suspended. It is not put up now.
On the day it is put up, "(date)" is replaced with that day.

> Nusquama has been suspended since (date) (Institutions, "Freezing").
> Requests for knighthood are not being accepted.
> The roll of knights, the King's errata and the rules stay public as they were when Nusquama was suspended.
> Requests for deletion, correction or leaving are received with the same [form](https://github.com/cpsbvbng26-dotcom/nusquama/issues/new?template=request.yml) as before, and answered as far as possible.
> Personal data is handled as the [Privacy](policies/privacy.en.md) page says.
> This is a work of fiction, written for fun.

## Ten years ahead

Some things will not grow, even in ten years.

- No land, currency, passports, certificates or objects will be made.
- No ranks will be added. There is only one: knight.
- Requests from people who live outside Japan, or who are outside Japan when applying, will not be accepted until the laws of that country have been checked.
- Applications from people who hold Italian nationality will not be accepted.
- Applications from people who hold the nationality of a country that restricts accepting foreign titles will not be accepted.

Some things will go on.

- Recording mistakes and widening the domain.
- Keeping the rules in step with changes in the law.
- Reviewing once a year.

On 7 November 2036, this outlook will be compared with what happened, and the result announced in the gazette.
