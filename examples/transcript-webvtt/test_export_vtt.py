import unittest

from export_vtt import to_webvtt


class ExportTests(unittest.TestCase):
    def test_source_times_and_returned_voices(self):
        data = {
            "state": "ready",
            "lines": [
                {"start": 3600, "end": 3601.004, "text": "Next\n\nline."},
                {"start": 1.25, "end": 2, "speaker": 0, "text": "A < B --> C"},
            ],
            "speakers": [{"id": 0, "name": "Speaker 1"}],
        }
        self.assertEqual(to_webvtt(data),
                         "WEBVTT\n\n00:00:01.250 --> 00:00:02.000\n"
                         "<v Speaker 1>A &lt; B --&gt; C</v>\n\n"
                         "01:00:00.000 --> 01:00:01.004\nNext line.\n")

    def test_caption_response_without_speakers(self):
        data = {"state": "ready", "speakers": None, "lines": [
            {"start": 0, "end": 1, "text": "Hello"}
        ]}
        self.assertEqual(to_webvtt(data), "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello\n")

    def test_incomplete_or_unusable_responses(self):
        for data in [
            {"state": "pending"},
            {"state": "ready", "paragraphs": ["hello"]},
            {"state": "ready", "lines": [{"start": 1, "end": 1, "text": "hello"}]},
            {"state": "ready", "lines": [{"start": 1, "end": 2, "speaker": 8, "text": "hello"}]},
        ]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                to_webvtt(data)
