Source: https://www.w3.org/WAI/media/av/transcripts
Title:  Transcripts | Web Accessibility Initiative (WAI) | W3C
Fetched: 2026-09-08T00:36:21.820Z

## Introduction

Basic transcripts are a text version of the speech and non-speech audio information needed to understand the content.

_Who:_ Basic transcripts are used by people who are Deaf, are hard of hearing, have difficulty processing auditory information, and others.

**_Descriptive transcripts_** for videos also include visual information needed to understand the content.

![](https://www.w3.org/WAI/content-images/media-guide/braille.jpg)

_Who:_ Descriptive transcripts are needed to provide audio and video content to people who are both Deaf and blind. They are also used by people who process text information better than audio and visual/pictorial information.

Ideally you provide a descriptive transcript, and then you do not need a separate basic transcript.

_Interactive transcripts_ highlight text phrases as they are spoken. Users can select text in the transcript and go to that point in the video. This is a feature of the media player. It uses the captions file.

![](https://www.w3.org/WAI/content-images/media-guide/interactive-transcript.png)

## Does My Media Need a Transcript?

**Short answer: Yes, descriptive transcripts are needed to meet the wide range of user needs**.

In some cases, transcripts are not required to meet WCAG standards. _(The Planning page of this resource introduces the [WCAG Standard](https://www.w3.org/WAI/media/av/planning/#wcag-standard).)_

**WCAG excerpts** with emphasis added, additions in \[brackets\], and links to more information in “Understanding WCAG”:

- [A 1.2.1 Audio-only and Video-only](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)(Prerecorded): For prerecorded audio-only and prerecorded video-only media, the following are true…

  - Prerecorded Audio-only: An alternative for time-based media \[transcript\] is provided that presents equivalent information for prerecorded audio-only content.
  - Prerecorded Video-only: Either an alternative for time-based media \[descriptive transcript\] **_or_** an audio track \[of description\] is provided that presents equivalent information for prerecorded video-only content.
- [AAA 1.2.8 Media Alternative](https://www.w3.org/WAI/WCAG22/Understanding/media-alternative-prerecorded.html) (Prerecorded): An alternative for time-based media \[transcript\] is provided for all prerecorded synchronized media and for all prerecorded video-only media.
- [AAA 1.2.9 Audio-only](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-live.html) (Live): An alternative for time-based media \[live stream text or transcript\] that presents equivalent information for live audio-only content is provided.

### Provide a Descriptive Transcript for Your Videos

Descriptive transcripts are needed by people who are Deaf-blind and others. (A bit more justification is in the Planning page: [Descriptive Transcripts](https://www.w3.org/WAI/media/av/planning/#descriptive-transcripts).) And **descriptive transcripts are easy and inexpensive to make** using captions and audio description that you already have to meet Level AA, as explained on this page.

## Process – Skills and Tools

The process for providing transcripts is basically:

1. Get a text version of the audio, called “transcribing”.
2. Format the transcript.
3. Put the transcript online, and make it easy for users to find the transcript from the audio or video file.

### If You Start with Captions

For videos, often transcribing the audio to text is done to create captions, as described in the [captions page](https://www.w3.org/WAI/media/av/captions/). Then the captions file is used to create the transcript.

Creating transcripts from caption files is easy with basic web skills and tools.

### If You Start with Transcribing

Transcribing an audio file takes quite a bit of time for people who don’t have the software and skill for it. Many organizations choose to outsource the transcribing. Guidance for doing it yourself (DIY) is in another page of this resource: [Transcribing Audio to Text](https://www.w3.org/WAI/media/av/transcribing/).

Once you have the transcription, creating the transcript is easy with basic web skills and tools.

## Creating Transcripts

If you already have captions, you can use that file to create the transcript. Most caption-editing tools provide an option to export a plain text transcript. Otherwise, you will need to delete the timestamps, or edit them per below.

If you don’t have captions, you’ll need transcription of the audio information. That’s addressed in another page of this resource: [Transcribing Audio to Text](https://www.w3.org/WAI/media/av/transcribing/).

Captions are generally written to be viewed along with the visual video. Transcripts should include important visual information for those not seeing the video. When you use captions to create transcripts, **usually you will need to add visual information to the transcript**, such as text that is in the video and speaker identification.

### Transcript File Format

Most transcripts on the web are provided in HTML. There is not a set design for transcripts. Different options and examples are described throughout the guidance below.

A transcript of a podcast can be simple text paragraphs with the speakers identified.

A descriptive transcript can be in a table so that readers can easily read only the audio information down a column if they choose. A [descriptive transcript example is below](https://www.w3.org/WAI/media/av/transcripts/#descriptive).

### Making Transcripts More Useful

Keep in mind that the main purpose of a transcript is to provide the information to people who cannot get it from the audio and/or video. That will help you know what to include and how to design it. Add information to make the transcript more useful. For example, add headings, links, a summary, and maybe time stamps, as described below. The following are optional, not requirements.

- **Put the information in logical paragraphs, lists, and sections**. If you’re starting with a captions file, you will probably combine several lines into paragraphs. For example, in the [example excerpts below](https://www.w3.org/WAI/media/av/transcripts/#example-descriptive-transcript-from-caption-files), 6 lines of captions are grouped into 2 paragraphs of text (in table cells).

- **Add navigation and clarifications:**
  - Add headings and links where it will make the transcript more usable. (This also helps with SEO, search engine optimization.) Here’s an [example with added links in short podcast transcript](https://www.w3.org/WAI/highlights/200606wcag2interview.html).
  - It is generally acceptable to add clarifying information, _as long as it is clear that it is not part of the actual audio_ — for example, words added to a paragraph put in \[brackets\], or separate sections with headings “Introduction”, “Transcript”, “Resources”. Here’s an [example with added headings in long presentation transcript](https://www.w3.org/WAI/highlights/200706wcag2pres).
- **Indicate the speakers based on the type of content.**For example:

  - When there are multiple speakers, you could use hanging indents to make it easy to skim for a particular speaker.
  - When you want the focus on the interviewee’s answers and not the interviewer, you could bold the interviewee’s name so it stands out more clearly.
- **Include timestamps only when useful.** In many cases, including timestamps would be unnecessary clutter. If you do include them, they usually don’t need to be as granular as the captions, and do not need to include end times.

- **If starting with captions for video:** The video might have text information that was not included in the captions, for example, the title of the video or the name and title of people speaking. If you also have the description of visual information, it should already be in there. If not, you’ll need to review the video and see if there is text visually that wasn’t repeated in the captions, and add that to your transcript.

## Where to Put Transcripts

Make it is easy for users to know that a transcript is available and to get to the transcript. For example, put the transcript itself or a link to the transcript right under the video.

For media on your website, usually it’s best to include the transcript on the same page. Here’s an [example descriptive transcript at the bottom of same page with a video](https://www.w3.org/WAI/perspective-videos/captions/#transcript).

When your media is hosted elsewhere, you might have the transcript on a separate web page. Here’s an [example podcast transcript on separate page](https://www.w3.org/WAI/highlights/200606wcag2interview.html).

## Example Descriptive Transcript from Caption Files

Below is an example of caption files used to create a descriptive transcript.

**Notice that the single lines in the caption files have been grouped together in table cells.**

[Back to Top](https://www.w3.org/WAI/media/av/transcripts/#top)