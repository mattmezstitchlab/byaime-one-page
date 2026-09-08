Source: http://diva-portal.org/smash/get/diva2:1393660/FULLTEXT01.pdf
Title: Conformity Behavior in Music Playlist Creation in a Group
Fetched: 2026-09-08T00:36:26.154Z

# Conformity Behavior in Group Playlist Creation

**Christine Bauer**
Johannes Kepler University Linz
Institute of Computational
Perception & LIT AI Lab
Linz, Austria
christine.bauer@jku.at

**Bruce Ferwerda**
Jönköping University
Department of Computer
Science and Informatics
Jönköping, Sweden
bruce.ferwerda@ju.se

## Abstract

A strong research record on conformity has evidenced that
individuals tend to conform with a group’s majority opinion. In contrast to existing literature that investigates conformity to a majority group opinion against an objectively
correct answer, the originality of our study lies in that we investigate conformity in a subjective context. The emphasis
of our analysis lies on the concept of “switching direction”
in favor or against an item. We present first results from
an online experiment where groups of five had to create
a music playlist. A song was added to the playlist with an
unanimous positive decision only. After seeing the other
group members’ ratings, participants had the opportunity
to revise their own response. Our results suggest different
conformity behaviors for originally favored compared to disliked songs. For favored songs, one negative judgement
by another group member was sufficient to induce participants to downvote the song. For originally disliked songs, in
contrast, a majority of positive judgements was needed to
induce participants to switch their vote.

## Author Keywords

Conformity behavior; social influence; music playlist creation; group music playlists; group recommendation.

Permission to make digital or hard copies of part or all of this work for personal or
classroom use is granted without fee provided that copies are not made or distributed
for profit or commercial advantage and that copies bear this notice and the full citation
on the first page. Copyrights for third-party components of this work must be honored.
For all other uses, contact the owner/author(s).
*CHI ’20 Extended Abstracts, April 25–30, 2020, Honolulu, HI, USA.*
© 2020 Copyright is held by the author/owner(s).
ACM ISBN 978-1-4503-6819-3/20/04.
http://dx.doi.org/10.1145/3334480.3382942

---

## CCS Concepts

•**Human-centered computing***!* **User studies; Empiri-**
**cal studies in HCI;** •**Applied computing***!* **Psychology;**
•**Information systems***! Recommender systems;*

## Introduction

Social influence and conformity have been studied in faceto-face situations for a long time [32]. While social influence
has been studied in online settings as well [40,39], conformity has received far less attention [32]. Most online conformity research focuses on conformity to group norms in
online communities (e.g., [35,28]) or on conformity in expression in online reviews (e.g., [16]). Yet, there are other
forms of online group scenarios that deserve attention. Algorithmic decision-making for groups, for instance, is an
increasingly important topic (e.g., [21,34].

A special form of algorithmic decision-making for groups
are so-called *group recommender systems* [26] that compute the most relevant item(s) (e.g., movies to be watched,
vacation packages for the next group holiday) for the whole
group. A particular challenge of group recommenders is to
consolidate the various—possibly contradicting—preferences
of the various group members [26,13]. While studies investigating conformity typically follow a study design where
participants have to decide between a correct and a wrong
answer, group recommender systems operate on taste,
preferences, and relevance where none of the decisions is
objectively correct or wrong. Yet, conformity in such settings
has not been investigated in depth.

We address this research gap and present first results of
our study on conformity, which is part of our ongoing research on group recommender systems. Our online experiment where groups had to create a music playlist contributes to the following research question: *Whether and*

*how do people conform in a group-decision setting of pref-*
*erences and taste?*

This paper is structured as follows: First, we present the
conceptual basis and discuss related work. Then, we detail
the study design of our online experiment. After reporting
the results, we discuss the findings and implications, and
point to future research.

## Conceptual Basis and Related Work

Social influence refers to the change in an individual’s thoughts,
feelings, attitudes, or behavior resulting from the interaction with another individual or a group [37]. Responses
to social influence may take forms of conformity or nonconformity [27]. In this work, we focus on conformity which
is a concept from social psychology and was coined by
Asch [1,2,3]. It refers to the phenomenon that individuals
tend to forgo their personal strategy (e.g., opinion, preference) and adopt the conflicting majority variant [36].

## Studies on Conformity

In context of conformity, Deutsch and Gerard [9] distinguish
*informational* and *normative* influence. *Informational in-*
*fluence* occurs if an individual adopts the thoughts and
attitudes from the social environment as their own [37].
Frequently, the social environment is used as guidance in
uncertain situations [17] in an attempt to be right [38]. *Nor-*
*mative influence*, in contrast, describes that an individual
expresses a particular opinion or behavior in order to fit the
given social environment without necessarily holding that
opinion or believing that the behavior is appropriate [37]. In
such cases, conformity is commonly based on a goal of obtaining social approval [32] and motivated by an individual’s
attempt to fit in with a group [38].

The most influential study of conformity goes back to Asch [1,
2,3]. In his conformity experiments, a significant proportion

---

## Sidebar 1:

## Computation of Bots

The decisions of the bots
were programmed in such
a way that for the initial
response each bot had a
30% chance to vote for a
song in a similar fashion
as the participant and 70%
chance against. For the
final response, bots were
programmed with a 50/50
chance of only changing in
the sub-scale of their initial
response (i.e., *yes*/*maybe*
*yes* or *no*/*maybe no*). For the
bots, no complete switch in
<u>the vote happened.</u>

of participants (33.3%) revised their individual judgements
to agree with a clearly incorrect, yet unanimous majority.
Asch’s study design (i.e., a line judgement task) was used
by an extensive number of studies (for a meta-analysis
see [4]). Crutchfield [8] took a similar paradigm for investigating conformity, yet removing the face-to-face situation
and varying the tasks to be performed (e.g., including logical tasks and expressions of attitudes). One major finding
of conformity research is that individuals tend to change
their personal judgements and opinions when challenged
by an opposing majority [1,4].

## Studies on Conformity in Online Settings

Results from studies on conformity in computer-mediated
scenarios vary to a great extent. When following the procedure of Asch’s original line judgment task in a computermediated setting, the majority influence disappeared in an
early study [33], whereas the conformity to a majority was
clearly observable in later studies, though demonstrating
lower effects when compared to a face-to-face condition [6].

Furthermore, individuals from collectivistic cultures were
found to manifest greater levels of conformity than those
from individualistic cultures in face-to-face settings [5],
whereas this effect could not be observed in a computermediated setting when using Asch’s study design [6]. Yet,
online studies investigating conformity outside Asch’s paradigm
found similar cultural effects to the ones observed in faceto-face settings. For instance, when writing online reviews,
consumers from collectivistic cultures are less likely to deviate from the average prior rating in their own reviews [16].

Further studies outside Asch’s paradigm have investigated
various forms of conformity in online settings. Results indicate that depersonalization and anonymity may lead to a
more extreme perception of group norms [20] and may encourage individuals to more strongly conform to those [29,

30]. Studies on social media [25,24] showcased that people tend to adopt the majority’s opinion on social or political
issues. A recent study [38] found that the level of conformity to the majority increased as the difference between the
majority size and the minority size increased. A study with
mixed groups of human and nonhuman agents [15] found
different levels of conformity depending on group composition and task type. Carrying out a task where they had to
judge emotions led to higher levels of conformity with the
group opinion as the number of humans in the group increased. When performing arithmetic operations, such an
effect has not been observed.

## Studies on Conformity and Music

Studies on conformity related to music preferences are
scarce. Inglefield [18] (cited in [14]) found that differences
in perceived peer group membership affected changes in
preferences across musical styles. Investigating conformity concerning music preferences, Furman and Duke [14]
found that participants unfamiliar with orchestral music were
significantly influenced by the others’ judgements, whereas
no conformity effect was observed for participants familiar
with such music. With the same study design but for pop
music, in contrast, no such effects have been observed.

In an online music listening setting, a study [12] found that
feedback—irrespective of the source—significantly influenced participants’ judgements, where feedback from other
individuals was more influential than feedback allegedly
based on a computational analysis of the music. Another
study [10] found that popularity influence (i.e., driven by the
overall popularity of an item in the whole community) and
proximity influence (i.e., driven by the popularity of an item
in the immediate social network of friends) are substitutes
for one another. Yet, when both are available, proximity influence dominates the effect of popularity influence.

---

Top-10 Tracks

Below are maximum 10 songs that you have been listening to most. Based on the song that you will pick, we will put you in a group with similar minded people. The task for you and your group members is to create a playlist. With your group members you will need to come to an agreement on which song you add to the playlist.

Fall On Me
— A Great Big World, Christmas Aguilera
i choose this song

Ex'r & Oh'r
— Elie King
i choose this song

Love On Top
— Beyond
i choose this song

**Figure 1:** Screenshot with a
participant’s most played songs
for choosing one seed song.

**Sidebar 2:**
**Spotify API**
https://developer.spotify.com/

## Sidebar 3:

## Configuration of the Popu- larity Parameter

Song suggestions were provided based on the selected
seed song by using the popularity parameter of 25 or
75. The popularity parameter
switched when participants
provided the same initial
response to a song for five
consecutive times to increase chances of different
initial responses.

*Social Influence and Recommender Systems*
Early work [7] has shown that a system’s recommendations
may affect users’ opinions on the items. Later research
could demonstrate that social influence plays a crucial role
in recommender systems. For instance, people tend to reverse their rating choices when confronted with other people’s ratings, especially when facing a moderate number of
opposing opinions [41].

As social factors play a particularly important role in group
recommender systems [31], there are attempts to come up
with algorithmic mechanisms that account for such factors.
For instance, [11] identify group leaders and give respective
weight to their preferences in a group music recommender.
A work by [22] proposes a conformity modeling technique
to improve the accuracy of rating predictions in a movie
recommender by anticipating conformity dynamics.

## Study Design

In this paper, we present first results of an online experiment where groups of five had to create a group playlist.
A majority size of three is sufficient for the full conformity
impact [1]. To have full control on the group decisions,
the only real person in the group was the participant. Responses of the four bots were calculated given a certain
chance (see Sidebar 1 for details on bots programming).

The study started with an introduction to the purpose of the
study: to investigate how groups of people create music
playlists. After that, we asked participants to provide us access to their Spotify listening history by using the Spotify
API (Sidebar 2). By using the “top” endpoint of the participant’s Spotify account, we were able to retrieve their
top-10 most listened songs. We asked participants to pick
one of the top-10 as a seed song (Figure1) to find (fictitious) group members with a similar music taste, and to

find songs to suggest for the playlist. We used the selected
seed song to retrieve song suggestions through the “get
recommendations” endpoint. By differing the popularity parameter (Sidebar 3) of the personalization endpoint, we
were able to suggest songs with different chances to be
initially favored or disliked by a particular participant.

The study design required songs that a particular participant would favor for the playlist as well as songs that a participant would dislike. The “get recommendations” endpoint
allowed to retrieve songs aligned (or not) to a particular
participant’s music preferences. A setting with a uniform,
randomly selected set of songs for all participants would not
have accounted for the specific preferences of the participants. Such a setting would have borne a high probability
that many participants would not have encountered a song
that they initially liked; our study design, though, required
any participant to encounter both scenarios—initially liked
and initially disliked songs.

Upon presenting a suggested song for the playlist, participants were asked whether they were familiar with the artist
and the song, and whether they would like to have the respective song as a candidate for the group playlist (Figure2). The response options were *yes*, *maybe yes*, *maybe*
*no*, and *no*. Participants were then put on hold for a random 5–10 seconds for all group members to provide their
anonymous response. While presenting the anonymous
responses of the group members, participants were asked
whether they wanted to change their initial response (Figure3) and were informed that in the next step all identities
with the corresponding final responses would be revealed.
Displaying the anonymous group responses in the first step
ensured that the study only factors in the concept of “majority size” and that other confounding variables such as
gender of group members (e.g., [38]) are avoided. With re-

---

Candidate Song

Song name:
On to Something Good

Artist name:
Ashley Monroe

Do you know this artist?
Yes No

Do you know this song?
Yes No

Would you like this song to be added to the playlist?
Yes Maybe Yes Maybe No No

Next Step

**Figure 2:** Screenshot with
candidate song to be added to
the playlist.

Group Member Yes

Group Member Yes

Group Member Yes

Group Member Yes

Please make your final judgment on this song.
Would you like this song to be added to the playlist?
Yes Maybe Yes Maybe No No

Next Step

**Figure 3:** Screenshot showing
the group’s votes, giving the
participant the opportunity to
revise their voting.

vealing the identities after the final response, we minimized
the depersonalization and anonymity effects observed in
online conformity research (e.g., [29,30]). After a final decision had been made and the whole group agreed to add
the song to the playlist (i.e., unanimous decision), the song
was added (Figure4); otherwise, the experiment continued
without adding the respective song. Participants were given
another song to rate until a playlist of 10 songs was created
through an unanimous decision-making with the group (the
study came to an end as well when more than 30 songs
were passed without coming to a consensus of 10 songs for
the playlist).

## Results

We recruited 96 participants via Amazon Mechanical Turk
(MTurk). Participants were selected based on their Human Intelligence Task (HIT) score with at least 1000 HITs
completed and a success rate of 95%. After cleaning the
data based on responses to attention questions, we ended
with 2047 valid responses of 93 participants. Of those responses, 574 responses were initially negative to adding
the suggested song to the playlist and 1473 were positive.

To investigate the conformity effect on the initial responses
of participants, two repeated measure ANCOVAs (one on
the initial positive and one on the initial negative responses)
were conducted to analyze how group responses influence
individuals’ final decision-making.

A first repeated measures ANCOVA was conducted on
the songs that participants initially indicated to want them
added to the playlist (i.e., a *yes* or *maybe yes* response).
The Greenhouse-Geisser correction determined that mean
responses on a song differed statistically significantly between time points (i.e., before and after presenting the
group responses): *F*(1*; :* 428) = 35*:* 730*; p <* 0*:* 0005,

as well as when considering the group responses through
the interaction effect: *F*(32*; :* 428) = 6*:* 688*; p <* 0*:* 0005.
Post hoc tests using the Bonferroni correction revealed
that after receiving the group response, participants significantly changed their final response to a more negative
one ( *:* 281): *p < :* 0001. Looking at the different combinations in the initial group responses, it seems that at
least one negative response within the group is needed
for participants to change their minds significantly (*t*(32) =
4*:* 563*; p < :* 0005). Hence, no majority of negative group
responses is needed for participants to change their final
response, but solely one negative response is sufficient.

A second repeated measures ANCOVA was conducted
on the initial negative response (i.e., a *no* or *maybe no* response) to adding a song to the playlist. Also in this case
the Greenhouse-Geisser correction determined that mean
responses on a song differed statistically significantly between time points (i.e., before and after presenting the
group responses): *F*(1*; :* 692) = 68*:* 689*; p <* 0*:* 0005. Taking into account the group responses, results showed a significant interaction effect as well: *F*(32*; :* 692) = 18*:* 521*; p <*
0*:* 0005. Post hoc tests using the Bonferroni correction showed
that participants significantly changed their final response to
positive (1*:* 012): *p < :* 0005. However, when looking at
the different combinations of the initial group responses,
the results show that participants only changed their final
response when there was a majority of votes (i.e., more
than half of the group responses were positive): *t*(32) =
2*:* 149*; p < :* 001.

## Discussion and Conclusion

## Findings and Discussion

The study results indicate different conformity behaviors dependent on a participant’s initial liking of a song. First, if a
participant originally favored a song, only one negative an-

---

Final Group Responses
The final decision has been made! The names and responses of all the group members are shown below.

Emma Yes

Sara Maybe Yes

James Maybe Yes

Steve Maybe Yes

Your final choice is Yes

Congratulations An unbelievable decision has been matched On Something Good by Ashley Monroe is added to the playlist.

Next Step

Playlist
1. Bright - Lost Kings Remix
— Eschosmith
2. Catch Us If You Can
— Elle King
3. On to Something Good
— Ashley Monroe
4.
5.
6.
7.
8.
9.
10.

**Figure 4:** Screenshot showing a
first song added to a group’s
playlist.

swer (i.e., not wanting to add the song to the group playlist)
from another group member was needed to increase the
probability that a participant would change their final decision (favoring to not favoring the song). Second, in contrast,
if a participant originally voted against a song being added
to the playlist, a majority of positive answers from the other
group members (i.e., at least three of the four other group
members wanted to add the song to the group playlist) was
needed to make the participant change their final decision
(not favoring to favoring the song).

The reasons for such behavior have yet to be investigated
in further research. One potential explanation is that the
preference in favor of a particular song is not overly strong,
so that changing one’s mind comes easy. However, in the
study design, only an unanimous decision in favor of a song
would lead to adding it to the playlist; thus, a participant
could keep the positive answer and the song would not be
included in the playlist because of someone else voting
against it. Hence, we speculate that an individual hesitates
to reveal to the group to favor a song that the rest of the
group does not like. Another potential reason in the specific
experiment setting is that there are lots of song alternatives
that could be added to a playlist; in other words, if a favored
song does not make it to the playlist, this does not involve a
high loss because there is a large amount of equally valuable alternatives available.

The need of a majority in favor of a song to flip the judgement of a participant who dislikes the song could be accounted for strong feelings against a particular song. In
contrast to the low loss of a favored song not being added
because of the available alternatives, adding a disliked
song to the playlist involves accepting a high loss. Yet, it
is interesting to observe that a majority in favor of a song
seems to induce participants to take this loss.

## Implications

As the *switching direction* (in favor or against an item) or
the involved *loss amount* seem to play an important role in
conformity behavior, our work has theoretical implications
for conformity research. Research on conformity following Asch’s paradigm investigates whether people conform
to a majority group opinion against a clear and objectively
correct answer (e.g., lengths of lines). Our experiment using music playlists targets a domain of taste and individual preferences (similar to other domains in entertainment
such as movies or the fashion domain). As our results suggest for the music domain, being in favor of or against an
item leads to different conformity behavior. The study design of our online experiment also differentiates from the
study of conformity in discussions of social issues or in the
political discourse. Typically, research in those domains
investigate conformity in terms of switching between two
mindsets in general (e.g., from a conservative to a liberal
mindset, or other way round) (e.g., [23,19]). Potentially
the switching direction (e.g., from conservative to liberal),
or the loss amount for accepting or discarding a particular
single issue associated within the one or the other mindset, may play a similar role in those domains. To the best
of our knowledge there is no work that studies conformity
on a more fine-grained level; where not only switching (e.g.,
conservative to liberal in general) is considered, but voiced
opinion changes on single issues (e.g., a specific planned
measure to counteract the climate crisis, to mitigate the unemployment problem, to boost economy) are investigated
separately. The expected loss involved in advocating or not
to such a specific measure may lead to different conformity behavior. Accordingly, differentiated strategies may be
needed to address the different opinions and needs.

Our findings have also implications for recommender systems. Typically, group recommender systems take the group members’ preferences as given. Only few studies consider that group members may conform with a majority or
an opinion leader. Our findings, though, imply that conformity has to be addressed at on a more fine-grained level,
considering the switching direction or the loss amount. Besides its implications for group recommenders, our findings
may give new direction for sequential recommendations for
individuals as well. For instance, we hypothesize that an
individual is more willing to accept that a preferred item is
not included than accepting a disliked item. If this proves
right, then a sequence or set of recommendations (e.g.,
music playlist) where all included items are perceived as
rather okay would be preferred over a set that may include
the individual’s most favorite item but also some disliked
ones. This perspective would require the development of
novel measures capturing satisfaction with a sequence of
recommendations.

**Acknowledgements**
This research is supported
by the Austrian Science Fund
<u>(FWF): V579.</u>

## Future Work

Motivated by these insights, we will continue with an indepth investigation on further factors potentially influencing
conformity. For example, in this study we asked for familiarity questions (artist and song) for the suggested song,
as well as satisfaction questions at the end of the study.
These factors may provide additional insights on the prerequisites of conformity effects. Additionally, we will investigate
cultural differences and further demographics such as gender and age, as these factors have been found influential in
earlier research. Furthermore, we plan to analyze whether
conformity evolves throughout the group-task process.

Having found that the switching direction leads to different conformity behavior in group playlist creation, we deem
worthwhile to investigate whether the direction of opinion
or preference change plays a role in other fields, including versatile topics such as the spread of fake news, po-

litical debate, and nudging effectiveness. The severity of
the expected consequences implied by an opinion change
may play a role in future theoretical and empirical pursuits
around conformity.

[1]Solomon E Asch. 1955. Opinions and social pressure.
*Scientific American* 193, 5 (1955), 31–35.
[2]Solomon E Asch. 1956. Studies of independence and
conformity: I. A minority of one against a unanimous
majority. *Psychological monographs: General and*
*applied* 70, 9 (1956), 1–17. DOI:
http://dx.doi.org/10.1037/h0093718
[3]Solomon E Asch. 1958. Effects of group pressure
upon the modification and distortion of judgments. In
*Readings in social psychology* (3rd ed.). Holt, Rinehart
and Winston, New York, NY, USA, 174–183.
[4]Rod Bond. 2005. Group Size and Conformity. *Group*
*Processes & Intergroup Relations* 8, 4 (2005),
331–354. DOI:
http://dx.doi.org/10.1177/1368430205056464
[5]Rod Bond and Peter B Smith. 1996. Culture and
Conformity: A Meta-Analysis of Studies Using Asch’s
(1952b, 1956) Line Judgment Task. *Psychological*
*Bulletin* 119, 1 (1996), 111–137. DOI:
http://dx.doi.org/10.1037/0033-2909.119.1.111
[6]Marco Cinnirella and Ben Green. 2007. Does
‘cyber-conformity’ vary cross-culturally? Exploring the
effect of culture and communication medium on social
conformity. *Computers in Human Behavior* 23, 4
(2007), 2011–2025.
[7]Dan Cosley, Shyong K. Lam, Istvan Albert, Joseph A.
Konstan, and John Riedl. 2003. Is Seeing Believing?

## REFERENCES

---

How Recommender System Interfaces Affect Users’
Opinions. In *Proceedings of the SIGCHI Conference*
*on Human Factors in Computing Systems (CHI ’03)*.
Association for Computing Machinery, New York, NY,
USA, 585–592. DOI:
http://dx.doi.org/10.1145/642611.642713
[8]Richard S Crutchfield. 1955. Conformity and character.
*American Psychologist* 10, 5 (1955), 191–198. DOI:
http://dx.doi.org/10.1037/h0040237
[9]Morton Deutsch and Harold B Gerard. 1955. A study
of normative and informational social influences upon
individual judgment. *The Journal of Abnormal and*
*Social Psychology* 51, 3 (1955), 629–636. DOI:
http://dx.doi.org/10.1037/h0046408
[10]Sanjeev Dewan, Yi-Jen Ho, and Jui Ramaprasad.
2017. Popularity or proximity: Characterizing the
nature of social influence in an online music
community. *Information Systems Research* 28, 1
(2017), 117–136.
[11]Pedro Dias and João Magalhães. 2013. Music
Recommendations for Groups of Users. In
*Proceedings of the 2013 ACM International Workshop*
*on Immersive Media Experiences (ImmersiveMe ’13)*.
Association for Computing Machinery, New York, NY,
USA, 21–24. DOI:
http://dx.doi.org/10.1145/2512142.2512151
[12]Hauke Egermann, Reinhard Kopiez, and Eckart
Altenmüller. 2013. The influence of social normative
and informational feedback on musically induced
emotions in an online music listening setting.
*Psychomusicology: Music, Mind, and Brain* 23, 1
(2013), 21–32. DOI:
http://dx.doi.org/10.1037/a0032316

[13]Alexander Felfernig and Martijn Willemsen. 2018.
Handling Preferences. In *Group Recommender*
*Systems: An Introduction*, Alexander Felfernig,
Ludovico Boratto, Martin Stettinger, and Marko Tkalcǐ č
(Eds.). Springer International Publishing, Cham,
Germany, 91–103. DOI:
http://dx.doi.org/10.1007/978-3-319-75067-5_5
[14]Charles E. Furman and Robert A. Duke. 1988. Effect
of Majority Consensus on Preferences for Recorded
Orchestral and Popular Music. *Journal of Research in*
*Music Education* 36, 4 (1988), 220–231. DOI:
http://dx.doi.org/10.2307/3344875
[15]Nicholas Hertz, Tyler Shaw, Ewart J. de Visser, and
Eva Wiese. 2019. Mixing It Up: How Mixed Groups of
Humans and Machines Modulate Conformity. *Journal*
*of Cognitive Engineering and Decision Making* 13, 4
(2019), 242–257. DOI:
http://dx.doi.org/10.1177/1555343419869465
[16]Yili Hong, Ni Huang, Gord Burtch, and Chunxiao Li.
2016. Culture, conformity, and emotional suppression
in online reviews. *Journal of the Association of*
*Information Systems* 17, 11, Article 2 (2016), 21
pages. DOI:
http://dx.doi.org/10.17705/1jais.00443
[17]Matthew J Hornsey, Louise Majkut, Deborah J Terry,
and Blake M McKimmie. 2003. On being loud and
proud: Non-conformity and counter-conformity to
group norms. *British journal of social psychology* 42, 3
(2003), 319–335.
[18]Howard G. Inglefield. 1972. Conformity behavior
reflected in the musical preference of adolescents.
*Contributions to Music Education* 1 (Autumn 1972),
56–67. DOI:http://dx.doi.org/10.2307/24127367

---

[19]Meagan Kelly, Lawrence Ngo, Vladimir Chituc, Scott
Huettel, and Walter Sinnott-Armstrong. 2017. Moral
conformity in online interactions: rational justifications
increase influence of peer opinions on moral
judgments. *Social Influence* 12, 2–3 (2017), 57–68.
DOI:
http://dx.doi.org/10.1080/15534510.2017.1323007
[20]Eun-Ju Lee. 2006. When and how does
depersonalization increase conformity to group norms
in computer-mediated communication?
*Communication Research* 33, 6 (2006), 423–447.
DOI:http://dx.doi.org/10.1177/0093650206293248
[21]Min Kyung Lee and Su Baykal. 2017. Algorithmic
Mediation in Group Decisions: Fairness Perceptions of
Algorithmically Mediated vs. Discussion-Based Social
Division. In *Proceedings of the 2017 ACM Conference*
*on Computer Supported Cooperative Work and Social*
*Computing (CSCW ’17)*. Association for Computing
Machinery, New York, NY, USA, 1035–1048. DOI:
http://dx.doi.org/10.1145/2998181.2998230
[22]Yiming Liu, Xuezhi Cao, and Yong Yu. 2016. Are You
Influenced by Others When Rating?: Improve Rating
Prediction by Conformity Modeling. In *Proceedings of*
*the 10th ACM Conference on Recommender Systems*
*(RecSys ’16)*. Association for Computing Machinery,
New York, NY, USA, 269–272. DOI:
http://dx.doi.org/10.1145/2959100.2959141
[23]Daniel J. Mallinson and Peter K. Hatemi. 2018. The
effects of information and social conformity on opinion
change. *PLOS ONE* 13, 5, Article e0196600 (05
2018), 22 pages. DOI:
http://dx.doi.org/10.1371/journal.pone.0196600

[24]Misa Maruyama, Scott P. Robertson, Sara Douglas,
Roxanne Raine, and Bryan Semaan. 2017. Social
Watching a Civic Broadcast: Understanding the Effects
of Positive Feedback and Other Users’ Opinions. In
*Proceedings of the 2017 ACM Conference on*
*Computer Supported Cooperative Work and Social*
*Computing (CSCW ’17)*. Association for Computing
Machinery, New York, NY, USA, 794–807. DOI:
http://dx.doi.org/10.1145/2998181.2998340
[25]Misa T. Maruyama, Scott P. Robertson, Sara K.
Douglas, Bryan C. Semaan, and Heather A. Faucett.
2014. Hybrid Media Consumption: How Tweeting
during a Televised Political Debate Influences the Vote
Decision. In *Proceedings of the 17th ACM Conference*
*on Computer Supported Cooperative Work & Social*
*Computing (CSCW ’14)*. Association for Computing
Machinery, New York, NY, USA, 1422–1432. DOI:
http://dx.doi.org/10.1145/2531602.2531719
[26]Judith Masthoff. 2015. Group Recommender Systems:
Aggregation, Satisfaction and Group Attributes. In
*Recommender Systems Handbook* (2nd ed.),
Francesco Ricci, Lior Rokach, and Bracha Shapira
(Eds.). Springer US, Boston, MA, USA, 743–776. DOI:
http://dx.doi.org/10.1007/978-1-4899-7637-6_22
[27]Paul R Nail, Geoff MacDonald, and David A Levy.
2000. Proposal of a four-dimensional model of social
response. *Psychological Bulletin* 126, 3 (2000), 454.
[28]JungKun Park and Richard Feinberg. 2010. E-formity:
consumer conformity behaviour in virtual communities.
*Journal of Research in Interactive Marketing* 4, 3
(2019/12/23 2010), 197–213. DOI:
http://dx.doi.org/10.1108/17505931011070578

---

[29]Tom Postmes, Russell Spears, and Martin Lea. 2000.
The formation of group norms in computer-mediated
communication. *Human communication research* 26, 3
(2000), 341–371.
[30]Tom Postmes, Russell Spears, Khaled Sakhel, and
Daphne De Groot. 2001. Social influence in
computer-mediated communication: The effects of
anonymity on group behavior. *Personality and Social*
*Psychology Bulletin* 27, 10 (2001), 1243–1254.
[31]Lara Quijano-Sanchez, Juan A. Recio-Garcia, Belen
Diaz-Agudo, and Guillermo Jimenez-Diaz. 2013.
Social Factors in Group Recommender Systems. *ACM*
*Transactions on Intelligent Systems and Technology* 4,
1, Article 8 (Feb. 2013), 30 pages. DOI:
http://dx.doi.org/10.1145/2414425.2414433
[32]Michael Rosander and Oskar Eriksson. 2012.
Conformity on the Internet – The role of task difficulty
and gender differences. *Computers in Human*
*Behavior* 28, 5 (2012), 1587–1595.
https://doi.org/10.1016/j.chb.2012.03.023
[33]Michael Smilowitz, D Chad Compton, and Lyle Flint.
1988. The effects of computer mediated
communication on an individual’s judgment: A study
based on the methods of Asch’s social influence
experiment. *Computers in Human Behavior* 4, 4
(1988), 311–321.
[34]Martin Stettinger, Alexander Felfernig, Gerhard
Leitner, and Stefan Reiterer. 2015. Counteracting
Anchoring Effects in Group Decision Making. In *User*
*Modeling, Adaptation and Personalization (UMAP*
*2015)*, Francesco Ricci, Kalina Bontcheva, Owen
Conlan, and Séamus Lawless (Eds.). Springer
International Publishing, Cham, Germany, 118–130.

[35]Michail Tsikerdekis. 2013. The effects of perceived
anonymity and anonymity states on conformity and
groupthink in online communities: A Wikipedia study.
*Journal of the American Society for Information*
*Science and Technology* 64, 5 (2013), 1001–1015.
DOI:http://dx.doi.org/10.1002/asi.22795
[36]Edwin J.C. van Leeuwen, Rachel L. Kendal, Claudio
Tennie, and Daniel B.M. Haun. 2015. Conformity and
its look-a-likes. *Animal Behaviour* 110 (2015), e1–e4.
DOI:
http://dx.doi.org/10.1016/j.anbehav.2015.07.030
[37]Lisa Slattery Walker. 2015. Social Influence. In *The*
*Blackwell Encyclopedia of Sociology*. American
Cancer Society. DOI:http://dx.doi.org/10.1002/
9781405165518.wbeoss154.pub2
[38]Senuri Wijenayake, Niels van Berkel, Vassilis
Kostakos, and Jorge Goncalves. 2019. Measuring the
Effects of Gender on Online Social Conformity.
*Proceedings of the ACM Human-Computer Interaction*
3, CSCW, Article 145 (Nov. 2019), 24 pages. DOI:
http://dx.doi.org/10.1145/3359247
[39]Stephan Winter, Caroline Brückner, and Nicole C.
Krämer. 2015. They Came, They Liked, They
Commented: Social Influence on Facebook News
Channels. *Cyberpsychology, Behavior, and Social*
*Networking* 18, 8 (2015), 431–436. DOI:
http://dx.doi.org/10.1089/cyber.2015.0005
[40]Kexin Zhao, Antonis C. Stylianou, and Yiming Zheng.
2018. Sources and impacts of social influence from
online anonymous user reviews. *Information &*
*Management* 55, 1 (2018), 16–30. DOI:
http://dx.doi.org/10.1016/j.im.2017.03.006

---

[41]Haiyi Zhu, Bernardo Huberman, and Yarun Luon.
2012. To Switch or Not to Switch: Understanding
Social Influence in Online Choices. In *Proceedings of*
*the SIGCHI Conference on Human Factors in*

*Computing Systems (CHI ’12)*. Association for
Computing Machinery, New York, NY, USA,
2257–2266. DOI:
http://dx.doi.org/10.1145/2207676.2208383