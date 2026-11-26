# Privacy

Last updated: 2026-11-26.

This is an English translation. The [Japanese version](./privacy.md) governs; if the two differ, the Japanese version applies.

## Who handles the data

The operator of Nusquama, an individual who owns the GitHub account cpsbvbng26-dotcom.
The operator handles personal data in line with Japan's Act on the Protection of Personal Information.
The operator's name and address are given without delay to the person who asks for them, at a contact that person has made public on their own GitHub profile.
To ask, choose 「非公開の連絡を求める」 ("Ask for a private contact") as the kind in the [Requests](./requests.en.md) form.
A person with no such contact can receive them by making a contact public on their own GitHub profile for a while. The name and address are not written in the issue ([Requests](./requests.en.md), "Requests that cannot be made in public").

## What the site collects

The site uses no cookies and has no analytics and no advertising.
The pages of the site request nothing from any other server.
The site is served by Vercel (United States). To serve it, Vercel may process and log requests, including IP addresses. Vercel handles them under its own privacy policy.

## What an application for knighthood involves

Applications for knighthood are meant to be received as public issues on GitHub (United States).
Applications have been paused since 2026-11-12, and no information is now being received through applications for knighthood. While applications are paused, the application form is not offered either ([Rules on Knighting](./knighting.en.md), "Pause in receiving applications").
Once applications reopen, an application involves:

- The GitHub account name
- A public link to the correction
- An account of what was wrong and how it was corrected
- The answer under "称号を使わない場所" (Places where the title is not used) (from 2026-12-15; [Rules on Knighting](./knighting.en.md), "Barriers to participation")
- The tick that the applicant has never been outside Japan since birth (from 2026-11-24; [Rules on Knighting](./knighting.en.md), "Never having been outside Japan")
- The day the correction was published, and the tick that the original text with the error is a text the applicant wrote (from 2026-12-15; [Rules on Knighting](./knighting.en.md), "Barriers to participation (continued)")
- The tick that the applicant holds Japanese nationality (from 2026-12-15; [Rules on Knighting](./knighting.en.md), "Holding Japanese nationality")

These are public in the issue. For those knighted, the GitHub account name, the day of knighting, a summary of the mistake corrected and a link to the application are put on the [roll of knights](../KNIGHTS.en.md).
No real name, address, affiliation or contact details are asked for, and the form asks applicants not to write them.
About never having been outside Japan, only whether the box is ticked or not is handled. The tick stays as part of the application issue. No passport, document, date or country visited is asked for, and no history of travel outside Japan is collected or kept. The form also asks applicants not to write them.
About holding Japanese nationality, only whether the box is ticked or not is handled. The tick stays as part of the application issue. No passport, family register, certificate of residence or other document, and no other nationality held, is asked for or kept. The form also asks applicants not to write them.
Nothing sensitive, such as illness, disability, belief or criminal record, is asked for either, and the form asks applicants not to write it.
But if the linked correction gives a real name or affiliation, the roll and the issue publicly connect the account name with that person.
Issues are also subject to GitHub's Terms of Service and Privacy Statement.
When an application issue is opened or edited, an automatic check in GitHub Actions reads the ticks in the form and the text of the link to the correction.
The automatic check does not open the link to the correction. It sends no request to the linked site, and keeps nothing of what is there.
The operator is the one who opens and reads the linked page ([Rules on Knighting](./knighting.en.md), "What the operator checks").
From 2026-12-15, to check whether 365 days have passed since the previous application, the automatic check receives from GitHub's API the list of application issues for knighting opened by the same account. The list also contains titles and bodies, but only the issue number and the time of opening are used; the rest is discarded. Nothing used is kept anywhere.
From 2026-12-15, to check whether there is a declined application, the automatic check also receives from GitHub's API the list of application issues for knighting opened by the same account that have the label 断った (declined). Likewise, only the issue number and the time of opening are used.
From 2026-12-15, to check whether the account was created at least 2 years earlier, the automatic check receives from GitHub's public API the answer for the account that opened the application issue. The answer also contains the items of the profile, but only the time the account was created is used; the rest is discarded. The time of creation is not kept either, and is written neither in the comment nor in the log of the run. The applicant is asked nothing.
All of these are public information, and are used for nothing but deciding on knighting.

## What a report of a mistake involves

Reports of mistakes in the King's texts are received as public issues on GitHub (United States), through the form [誤りの知らせ (Report a mistake)](https://github.com/cpsbvbng26-dotcom/nusquama/issues/new?template=error.yml).
A report involves the GitHub account name and what the report says.
These are public in the issue. The King's errata do not name the person who reported the mistake.
No real name, address, affiliation or contact details are asked for, and the form asks reporters not to write them.
From 2026-12-01, error reports are received only from people in Japan. To check this, the form asks for the reporter's ORCID iD, and only these parts of that public ORCID record are read: the link to the GitHub account, the country of each public address, and the country of the organisation of each current (no end date) employment and education, each with the day it was added. Only the country codes (ISO) are read; nationality is never read.
A reporter is taken as being in Japan only if an entry naming Japan was added at least 30 days before the issue was opened and no entry names another country. A report that cannot be checked is not accepted, and gets a label and a fixed comment; the issue is not closed.
From 2026-12-15, for a report opened on or after that day, the 30 days become 365 days. The items read do not change.
From 2026-12-15, a report opened on or after that day is not accepted unless at least 6 characters, not counting spaces, are written in the field "確かめた先" (Checked against) of the form; it gets the label "source not given" and a fixed comment, and the issue is not closed. The field has always been in the form, and no new information is collected.
The countries and organisations read are not stored, and are written neither in a comment nor in the log of the run; only whether the check passed is written.
From 2026-12-15, a report opened on or after that day is received at most once in 30 days from the same GitHub account. Until 30 days, not counting the day itself, have passed since that account opened its previous error report, a report is not accepted, and gets the label "one per 30 days" and a fixed comment; the issue is not closed. Every issue with the label 誤り (error) counts, including reports that were not accepted.
For this, the list of issues with the label 誤り (error) opened by the same account is received from GitHub's API. The list also contains titles and bodies, but only the issue number and the time of opening are used; the rest is discarded and kept nowhere. For a report that is not accepted, the ORCID record is not read.
This limit does not apply to requests about removal, correction, withdrawal, rights, personal data or consent. Nor does it apply to reports of security problems.

## Purposes of use

To decide on knighting, to keep the roll, to answer requests, to check reported mistakes and record them in the King's errata, and, from 2026-12-01, to check that a person who reports a mistake is in Japan. Nothing else.
Article 21(1) of Japan's Act on the Protection of Personal Information reads: 「個人情報取扱事業者は、個人情報を取得した場合は、あらかじめその利用目的を公表している場合を除き、速やかに、その利用目的を、本人に通知し、又は公表しなければならない。」 This page publishes that purpose in advance.

## Providing data to others, and businesses in other countries

The information above is public on the services of GitHub and Vercel, both in the United States.
An applicant agrees, by a pledge in the form, to its being public and handled by these services.
The United States has no federal law that covers personal data comprehensively, like Japan's Act on the Protection of Personal Information. There are state laws, and the rights a person has differ by state and sector. There is no single authority for personal data for the whole country.
According to the survey of the Personal Information Protection Commission (as of October 2021), the United States has no adequacy decision of the EU and has taken part in the APEC CBPR system since 25 July 2012. The same survey lists, for the United States, no system that obliges businesses to cooperate with government collection of information in a way that may seriously affect the rights and interests of the person ([Personal Information Protection Commission, "外国制度（アメリカ合衆国）"](https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/), in Japanese).
GitHub's measures are in [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), and Vercel's in [Vercel's Privacy Notice](https://vercel.com/legal/privacy-notice).
The operator cannot confirm whether GitHub and Vercel take all the measures that correspond to the eight principles of the OECD Privacy Guidelines, because how they handle data inside can only be known from the policies they publish (Article 17(4) of the Enforcement Rules of the Act on the Protection of Personal Information). The difference that is known is their own use of public content, set out in the next paragraph.
There are two cases in which GitHub and Vercel use public content themselves, each set out in their terms; Nusquama cannot change them. GitHub's Terms of Service allow GitHub and its affiliates to use what is placed in issues and public repositories (including the applications and the roll) for AI features and to train the models of its affiliates (D.4). There is no setting to stop this for public content (J.3). Vercel's Terms of Service allow Vercel, on the free Hobby plan that serves Nusquama, to use the content of the site (including the roll) to train AI and machine-learning models, and to give it to third parties for that purpose, unless the account's team turns this off (section 3).
If these uses worry you because of your personal data, do not apply. A knight may ask at any time to be taken off the roll, and their name is then taken off it.
GitHub and Vercel are not processors handling personal data on the operator's behalf. They are used as the place of publication and of serving, after their terms and policies were checked.
The operator considers listing on the roll to be a provision to an unspecified large number of people. Its record (Article 29 of the Act on the Protection of Personal Information) is the repository history in which the row was added. The history keeps the day the row was added, the account name and the items listed. A row is added only for a person who ticked every pledge in the application form.
From 2026-11-18, for an issue opened with the form [Notice from a rights holder](https://github.com/cpsbvbng26-dotcom/nusquama/issues/new?template=rights.yml) whose box of consent to a language model is ticked, the operator may give its title and text to Claude (Anthropic, United States), to help handle the notice.
The operator treats this as a provision to a third party in a foreign country under Article 28 of the Act on the Protection of Personal Information. The system of the United States is as set out above. Anthropic's measures are in [Anthropic's Privacy Policy](https://www.anthropic.com/legal/privacy).
The box is optional. Without it, the operator handles the notice without giving it to Claude or to any other language model. Comments on the issue are not given to a language model. The consent can be withdrawn at any time, in that issue.
The operator receives no personal data from third parties. What it handles is only what the person writes and the link to the correction the person made public.
Except where the law requires, nothing is given to any other third party.

## How long data is kept

An entry on the roll is kept until a request to withdraw.
The issue of a declined application is kept, to show the one sentence of the decline; it is deleted if the applicant asks.
From 2026-12-15, the issue of a declined application gets the label 断った (declined). The issue with this label is the record that no application for knighting is ever received again from that account. If that issue is deleted at the applicant's request, the record goes too. No other list of declined accounts is made ([Rules on Knighting](./knighting.en.md), "Barriers to participation (continued)").
An issue that arrives as an application for knighthood while applications are paused has its title and body replaced with a short note by the automatic check, and is closed and locked. The operator copies nothing of what arrived to the roll or anywhere else. After the replacement, the issue shows only the account name of the person who opened it, the date it was opened, and the note.
The earlier title and body remain in the edit history that GitHub keeps for the issue. They are removed on a request to delete.
The automatic check does not copy the body of an issue into the record of its run (the GitHub Actions log).
On a request to delete, the operator deletes the issue, or empties its body and removes the earlier versions from its edit history too.
The history of the repository, and copies already made by others, may still hold an entry.
When an issue is opened or written to, GitHub sends a notification to the accounts set to receive that activity.
Depending on the settings of the person who receives it, a notification also arrives by email. An email notification holds a copy of the content of the issue.
The accounts that receive it may include the operator's.
That copy is handled under GitHub's Terms of Service and Privacy Statement.
GitHub's documentation says that notifications in the inbox that are not marked as saved are kept for 3 months.
The pages of GitHub's documentation that were fetched do not say that a notification already delivered goes away when the title and body of the issue are replaced, or when the issue is deleted.

## Security measures

The only personal data handled is what is in the public issues and on the roll of knights.
GitHub's notifications may carry a copy of the content of an issue to the holders of the accounts that receive them (see "How long data is kept" above). The operator may be one of them.
Apart from this, the operator gathers the data nowhere else and makes no other copy.
Only the operator's GitHub account, which owns the repository, can change the roll and the site.
That account uses two-factor authentication.
Every change to the roll and the site is kept in the public history of the repository and goes in only after passing the checks.
The site has no cookies and no database, and collects nothing from its readers.
When an issue is opened or edited, and when a comment on an issue is written or edited, an automatic check (`tools/personal.js`) counts the strings in the title and body that are shaped like contact details.
It looks for five shapes: e-mail addresses, phone numbers, postal codes, numbers in four groups of four digits, and numbers in three groups of four digits. It only looks at fixed shapes in the characters, and uses no language model and no outside service.
Where the writer is not the operator, only the strings found are replaced with the word "［伏せた］" (masked), the label "伏せた" is added, and a comment is left that gives only the number of each kind. The issue is not closed or locked. An issue that arrives as an application for knighthood while applications are paused has its title and body replaced with a note, as under "How long data is kept".
The strings found are written neither in the comment nor in the run log. The log shows only fixed words and numbers. GitHub keeps the earlier text in the edit history, and it is removed from there on a request to delete.
Conversations on pull requests are outside this check, and the operator reads them.
How handling in other countries is prepared for is set out above, under "Providing data to others, and businesses in other countries".

## If a leak or the like occurs

If a leak, loss or damage of personal data occurs that the law requires to be reported, the operator reports it to the Personal Information Protection Commission.
The persons concerned are then told too, in their application issue or on the page of the roll.
If the operator's GitHub account is taken over and the roll is altered or erased, this is treated in the same way.

## Requests for disclosure, correction, suspension of use and deletion

Anyone may ask at any time for an entry about them to be corrected or deleted, or to be taken off the roll.
Requests for disclosure of retained personal data and for suspension of its use are also met.
The procedure is in [Requests for removal, correction or withdrawal](./requests.en.md). There is no charge.
Any matter that Article 32 of the Act on the Protection of Personal Information requires to be made known and that is not on this page is answered without delay on request.
Complaints about the handling of personal data are received through the same request form.

## Minors

A person under 16 may not apply for knighthood.
The Q&A of the Personal Information Protection Commission says that, in general, the consent of a legal representative or the like is needed for children up to the age of 12 to 15 ([Q&A](https://www.ppc.go.jp/personalinfo/faq/APPI_QA/), Q1-62, checked on 2026-11-08). Nusquama has no means to check such consent, so it accepts no application from a person under 16.
When an application turns out to be from a person under 16, the name is taken off the roll and the issue is deleted, without being asked.
From 2026-12-15, a person under 18 may not apply for knighthood either ([Rules on Knighting](./knighting.en.md), "Barriers to participation"). Age is taken from the applicant's own declaration, by a tick in the form.
From 2026-12-15, when a person under 18 turns out to have applied with the box for being 18 or over ticked, the name is likewise taken off the roll and the issue is deleted, without being asked.

## Changes to this policy

When this policy changes, the date on this page is changed.
Earlier versions remain in the public repository.
