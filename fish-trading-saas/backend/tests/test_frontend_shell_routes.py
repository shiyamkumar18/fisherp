from django.test import SimpleTestCase


class FrontendShellRouteTests(SimpleTestCase):
    def test_shell_served_pages_render(self):
        for path in (
            "/dashboard-content.html",
            "/analytics.html",
            "/settings.html",
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
