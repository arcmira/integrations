# Export an Arcmira transcript as WebVTT

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Transcript response format](https://arcmira.com/docs/transcripts)

Turn a saved YouTube or podcast transcript into a WebVTT caption file. The converter runs locally with Python 3 and makes no network requests.

Save a ready response from the Arcmira transcript API with `timestamps=true`. From this directory, run:

```sh
python3 export_vtt.py transcript.json > episode.vtt
```

Each cue uses the start and end times returned by the API, rounded to milliseconds. On speaker-labeled lines, the converter joins the speaker ID to the name in the same response and writes a WebVTT voice tag. Unidentified names such as “Speaker 1” stay as returned. Caption lines without a speaker have plain text.

Review the words and names against the recording before publication. Use the same cut of the audio or video as the transcript. An ad insertion, new introduction or other edit can shift every cue that follows. A saved time range exports only the lines in that range and keeps their positions on the original timeline.

For podcast hosts, see [Apple’s instructions for providing transcripts](https://podcasters.apple.com/support/5316-transcripts-on-apple-podcasts). The script creates the file. Upload and distribution depend on your host.
