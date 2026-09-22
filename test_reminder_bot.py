import unittest
import csv
from carrybee_reminder_bot import parse_csv_line

class TestReminderBotCSVParser(unittest.TestCase):
    def test_parse_simple_line(self):
        line = "2026-06-29,9:21:40,F06289AV8CW,Paperfly"
        expected = ["2026-06-29", "9:21:40", "F06289AV8CW", "Paperfly"]
        self.assertEqual(parse_csv_line(line), expected)

    def test_parse_quoted_fields(self):
        line = '2026-06-29,12:41:08,F0627SXWXUE,"Sumaiya, Hair, Tonic"'
        expected = ["2026-06-29", "12:41:08", "F0627SXWXUE", "Sumaiya, Hair, Tonic"]
        self.assertEqual(parse_csv_line(line), expected)

    def test_parse_empty_line(self):
        self.assertEqual(parse_csv_line(""), [])

    def test_parse_quotes_with_embedded_newlines(self):
        # Even though parse_csv_line is deprecated, let's verify it behaves reasonably with single lines
        line = '"Line 1\nLine 2",field2'
        expected = ["Line 1\nLine 2", "field2"]
        self.assertEqual(parse_csv_line(line), expected)

if __name__ == '__main__':
    unittest.main()
