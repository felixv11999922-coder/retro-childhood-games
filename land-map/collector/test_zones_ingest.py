import unittest
from zones_ingest import ingest

class IngestionTests(unittest.TestCase):
    def test_polygon(self):
        data = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"zone_code":"ZH-1"},"geometry":{"type":"Polygon","coordinates":[[[37,55],[38,55],[38,56],[37,55]]]}}]}
        output, rejected = ingest(data, "Test", "https://example.org/pzz", "Decision 1")
        self.assertEqual(len(output["features"]), 1)
        self.assertEqual(rejected, [])
        self.assertEqual(output["features"][0]["properties"]["verification"], "source_supplied_unverified")

    def test_missing_geometry(self):
        data = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"zone_code":"ZH-1"},"geometry":None}]}
        output, rejected = ingest(data, "Test", "https://example.org/pzz", "Decision 1")
        self.assertEqual(len(output["features"]), 0)
        self.assertEqual(len(rejected), 1)

    def test_reject_http(self):
        with self.assertRaises(ValueError):
            ingest({"type":"FeatureCollection","features":[]}, "Test", "http://example.org", "Decision 1")

if __name__ == "__main__":
    unittest.main()
