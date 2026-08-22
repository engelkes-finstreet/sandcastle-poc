# A ping means it is your turn

The Slack thread worked. One post per issue, replies under it, links to the right tab at each
step — and nobody knew when a plan was waiting for them. Slack does not notify on a thread reply
unless you are following that thread, and you follow a thread by opening it and saying so. So
the design that made the channel readable also made it silent, and the only way to hear it was
to keep going back to check. Which is the thing a notification is for.

The obvious fix is to be @-mentioned in the post that starts the thread. It is worth writing down
why that is the wrong one.

**It pings at the moment you have nothing to do.** "🏰 Planning #7" means a container just
started. The message you actually need is `Plan posted, waiting for you`, twelve minutes later,
and that one is a reply. Mentioning in the parent buys a notification for the least useful post
in the thread.

**And it leans on thread-following anyway.** Slack does subscribe you to a thread you are
mentioned in, so replies would reach you — until the run where you unfollow one noisy thread, or
the mention lands in a thread you had already muted. The state is per-user, invisible from here,
and not something the watcher can assert. A notification path that depends on invisible
per-user state is one you cannot debug when somebody says "I didn't get it".

## Some posts are steps and some are stops

The split that works is not by importance, it is by **whose turn it is**. At any moment the
factory is either working or waiting on a person, and it knows which. A post made while it is
still working is a step; a post made because it has run out of things it can do alone is a
*stop*, and a stop is the only kind worth a notification.

`notifyAsk` is that second kind, and it does exactly one thing `notifySlack` does not: **it
@-mentions `SLACK_MENTION`**, because a mention is the only thing Slack reliably turns into a
badge and a push wherever the message lands, following or not. The post itself goes where every
other post about that issue goes — into the issue's thread.

Six posts ask, and the list reads as the answer to "what is the factory waiting for":
`announcePlanPosted`, `announceAttempt`, `announceFollowUp`, `announceRoundsSpent`,
`announcePlanningFailed`, `announcePlanningBlocked`. The last two are worth noticing, because
they are failures rather than gates: a planning run that died takes the label off the issue, so
nothing happens until a human re-adds it. That is a stop.

### The broadcast came out

The first version of this also set `reply_broadcast` on every ask, so a copy appeared in the
channel itself — the argument being that the mention notifies but the broadcast keeps the ask
visible to somebody scrolling later. In use that second argument did not hold up. The mention
already delivers the badge and the push, and it delivers them to the one person who has to act;
what the broadcast added was a second copy of the same message in the channel, next to a thread
entry that was already there. Two entries, one thing to do.

It also cost the thing the thread was for. Every post about an issue lives under one message, so
the plan, the review and the follow-up read as one conversation — and the broadcast pulled the
most important posts of that conversation out of it into the channel, where they sit next to
posts about other issues. The messages that most need their context lost the most context.

So asks stay in the thread with everything else, and the mention carries the whole job of getting
attention. If mentions ever prove too quiet, the escalation is a DM linking back to the thread —
see the options below — not a copy in the channel.

Everything else stays a step, including the ones that feel like news. `Plan approved —
implementing now` is progress. `Merged` is a fact, and the person reading it is the person who
merged it. `Change requested — working on it` is the watcher acknowledging *you*; pinging you for
your own comment is how a channel teaches people to mute it.

## Considered Options

**Mention in the initial thread post.** Above.

**Mention in every post.** Reliable, and self-defeating. The value of the ping is entirely in
what it means, and a ping on `implementing now` means nothing. Muted within a week, and the
`Plan posted` ping goes with it.

**Broadcast without mentioning.** Fixes visibility, not notification: a channel post only
notifies people whose channel preference is "all new messages", which is a setting nobody keeps
on for a bot channel. It would look fixed and behave the same.

**Mention *and* broadcast.** Built first, then removed — see above. The mention does the
notifying on its own, and the broadcast moved the posts that need their context out of the thread
that held it.

**A DM per ask, instead of the channel.** The most reliable delivery there is, and it splits the
record: the thread is the audit trail, and half the conversation would be somewhere only one
person can read. Still the escalation to reach for if mentions turn out to be too quiet — a DM
carrying a `chat.getPermalink` back to the thread post keeps the thread authoritative. Not built,
because the mention lands in the place the record lives and has not yet been shown to be too
quiet.

**Slack's own per-thread "Get notified about all replies".** The status quo, and the thing being
complained about: it works, once you remember to do it, per issue, forever.

## Consequences

- **`SLACK_MENTION` must be an ID, and a name fails silently.** `@patrick` in message text is
  plain text to Slack: it renders looking exactly like a mention and notifies nobody. So
  `renderMention` accepts only a member id, a user group id, or `here`/`channel`, and
  `mentionStatus` says at startup what it resolved — including, loudly, that a value it could
  not read is pinging nobody. That report is the whole defence against a misconfiguration whose
  symptom is indistinguishable from working.
- **Unset is a supported configuration.** The asks still post in the thread; they just address
  nobody. Nothing branches on it beyond the prefix.
- **The ask list is the thing to guard.** It is short because it is exactly the set of states
  where the factory is stopped, and that set is a property of the state machine rather than a
  matter of taste. A phase that starts pinging on its progress has stopped being able to tell
  its steps from its stops — the same failure that got the progress heartbeat removed.
- **The channel is strictly one entry per issue again.** Everything the watcher says about an
  issue is inside that issue's thread, asks included, so the channel reads as a list of issues
  and the thread reads as the story of one. An ask is found by its mention, not by its position.
- **An ask reaches exactly one person.** Whoever `SLACK_MENTION` names. Nothing about it is
  visible to a passer-by scrolling the channel — that is the trade, and if a rota or a second
  reader is ever wanted, the value becomes a user group rather than the message becoming louder.
- **Nothing depends on who the mention is.** It is one string, prefixed. A user group works, so
  does `here`; a rota or a second watcher instance needs no code change, only a different value.
