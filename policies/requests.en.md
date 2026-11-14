# Requests for removal, correction or withdrawal

Last updated: 2026-11-15.

This is an English translation. The [Japanese version](./requests.md) governs; if the two differ, the Japanese version applies.

## What may be asked for

- Withdrawal from the roll of knights (taking the name off).
- Correction or deletion of an entry about oneself on the roll or in an issue.
- Notice of the purpose of use, disclosure, correction, addition, deletion, suspension of use, erasure, or stopping the provision to third parties, of retained personal data about oneself.
- Deletion of one's personal data written without one's consent.
- Deletion of content that harms one's honour or reputation.
- Deletion of content that infringes one's rights (copyright, trademark, likeness and so on).
- A change of wording where Nusquama may be mistaken for something real.

There is no charge.
Requests are received in the same way, and answered as quickly, from people in any country, whatever country they live in and whatever their nationality. They are received in Japanese or in English.

## How to ask

Open an issue with the form [Requests for removal, correction or withdrawal](https://github.com/cpsbvbng26-dotcom/nusquama/issues/new?template=request.yml), and say which entry it concerns and what is asked.
When an issue is opened on GitHub's web pages, only the forms are offered (a blank issue appears only to those who can write to the repository).
An issue opened another way, such as through GitHub's API, is read by the operator. However, an issue opened while applications for knighting are paused, whose title or body carries the headings or boxes of the application form for knighthood, is handled in the same way as an application ([Rules on Knighting](./knighting.en.md), "Pause in receiving applications").
The only channel is GitHub. Nusquama has no contact outside GitHub. A free GitHub account is enough.
A request may be made by an agent. In that case, the person concerned writes a word in the issue, from their own GitHub account, that they asked the agent.
Do not copy the personal data in question into the issue. Say only where it is.

## Requests that cannot be made in public

Nusquama has no channel that receives requests privately.
On 2026-11-15 the owner decided to open GitHub's private vulnerability reporting as the private route for requests that cannot be made in public. Its usual purpose is reporting weaknesses in security; receiving requests through it is a use other than that.
The route can be used only once the feature is enabled for this repository. When checked through the GitHub API on 2026-11-15, it was not enabled. Until it is, the steps below apply.
If there is a reason a request cannot be written in public, choose 「非公開の連絡を求める」 ("Ask for a private contact") as the kind in the form, and leave the rest empty. The issue then shows only the GitHub account name, the title and the kind.
The operator answers privately only when the person who asks has made a contact public on their own GitHub profile, and then answers at that contact.
A person with no such contact can receive the answer by making a contact public on their own GitHub profile for a while.
When no contact is made public, the operator answers in the issue, without personal details.
A security problem with the site or the repository is reported in the same way ([How to report a security problem](../SECURITY.md)).

## After a request

The operator aims to answer each request within 7 days.
Where the harm is serious, such as exposed personal data, the entry is taken down at once, before any decision.
An entry that harms another person's honour or reputation is also taken down at once, before any decision. After it is taken down, whether that was right is checked.
Where taking it down turns out to have been wrong, it is put back, and the writer is told in the issue.
Where someone asks for an issue or comment written by another person to be taken down as infringing their rights, and it is neither of the two above (exposed personal data, or harm to honour or reputation), the operator reads what the request says. Where the operator considers that there are reasonable grounds to believe another person's rights are being unjustly infringed, the entry is taken down.
Otherwise, the operator shows the writer the information said to infringe, the right and the reason, and asks in that issue whether the writer agrees to its being taken down. If 7 days pass from the day of the question without the writer saying that they do not agree, it is taken down. If the writer says so, the operator decides and tells both the person who asked and the writer in the issue.
In every case, only the entry said to infringe the right is taken down.
Strings shaped like contact details in issues and comments, other than the operator's, are masked by the automatic check without waiting for a request; only those strings are masked ([Privacy](./privacy.en.md), "Security measures").
Withdrawal from the roll is granted whatever the reason.
Requests for disclosure, correction, suspension of use and the like are met without delay. Disclosure is made in the way asked; when an electronic record is asked for, an electronic record is given.
When a request is met, what was done is made known without delay. When the data asked for does not exist, or cannot be given in the way asked, that too is made known without delay.
When a request is not met, the reason is given.
From 2026-12-01, error reports are checked by the checked intake. If the quoted words are not found, the label "not verified" and a fixed comment are added. The checked intake never closes or locks an issue; the operator reads every one.
From 2026-12-01, error reports are received only from people in Japan (the form [誤りの知らせ (Report a mistake)](https://github.com/cpsbvbng26-dotcom/nusquama/issues/new?template=error.yml)). A request made with this request form is received from people in every country, and this limit does not apply to it.
A request for a correction of what is written about oneself, or for removal, withdrawal, rights, personal data or consent, can be made with this request form. A request written in an error report is not closed either. A request that the law requires to be received and handled is not turned away without being read, in whatever language and words it is written.

## Requests to disclose information on the sender

Article 5(1) of Japan's Act on information distribution platforms lets a person who claims that their rights were infringed by the distribution of information through specified telecommunications ask a provider of specified telecommunications services to disclose the sender information it holds. Among its requirements, item 1 is 「当該開示の請求に係る侵害情報の流通によって当該開示の請求をする者の権利が侵害されたことが明らかであるとき。」
Article 6(1) of that Act says that a provider that receives such a request 「当該開示の請求に応じるかどうかについて当該発信者の意見（当該開示の請求に応じるべきでない旨の意見である場合には、その理由を含む。）を聴かなければならない。」
A request to Nusquama to disclose sender information is received with this request form and handled as follows.

1. The operator confirms which entry the request is about, and which right is said to be infringed.
2. The operator asks the person who wrote it, in the issue, for their opinion on whether to disclose. Where they cannot be reached, or there are special circumstances, that is recorded.
3. Nothing is disclosed beyond what the law requires. The operator holds only the GitHub account name and what was written in the issue; more detailed sender information is held by GitHub, which records the issue.
4. When the request is not met, the reasons are given. A court can also be asked for an order to disclose sender information under Article 8 of that Act.

## What cannot be removed

Earlier versions in the repository remain unless its history is rewritten. Copies already made by others are beyond the operator's reach.
Earlier deployments kept at Vercel that contain the entry are deleted from Vercel on request.
Where it must be erased from the history of the repository, the operator asks GitHub to remove it.
From 2026-12-01, before a line of the roll is erased from the history on request, only the items of the record of provision for that line (the day it was added, that the recipients are many unspecified people, the account name that identifies the person, the items entered, and that consent was obtained) are recorded separately in `docs/records-of-provision.md`. Nothing else of the roll is recorded. Article 29 of Japan's Act on the Protection of Personal Information asks for this record, and Article 21, item 3, of its Enforcement Rules sets its period at 「三年」, so these items stay public there for three years from the day they are recorded.
