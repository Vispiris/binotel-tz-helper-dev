import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python_app"))

from binotel_tz import parse_tz_snapshot


ROWS = [
    ["Pro +"], ["Регіон", "Україна"], ["Мова MyBusiness", "Українська"],
    ["1. Номери компанії, які підключаємо до ВАТС"],
    ["Номери телефонів (у форматі 0931112233)", "Тимчасовий номер Binotel 1", "068 999 99 98", "073-999-99-98"],
    ["Дані для підключення номера", "ОТП додає номер самостійно", "Картка буде встановлена ​​пізніше", "SIP реєстрація"],
    ["Графік роботи"],
    ["", "Пн-Сб:", "Неділя:", "Решта часу неробочий?"],
    ["", "10:00 - 20:00", "вихідний", "так"],
    ["2. Внутрішні лінії для працівників"],
    ["Вкажіть нумерацію внутрішніх ліній", "901000", "902000"],
    ["3. Відділи"], ["", "Адміністрація"],
    ["Номери", "0689999998, 0739999998"], ["Лінії", "901000, 902000"],
    ["4. Групи співробітників"], ["Вкажіть номери груп", "801"],
    ["Вкажіть назву групи", "Адміністрація"],
    ["Внутрішні номери працівників", "901000, 902000"],
    ["5. Сценарії для вхідних дзвінків"],
    ["", "Робочий час з Feedback", "Неробочий час", "Вихідний день"],
    ["", "0689999998, 0739999998", "0689999998, 0739999998", "0689999998, 0739999998"],
    ["Голосове повідомлення Робочий час з Feedback, об’єкт Загальна", "Стандартне українською", "", ""],
    ["Вказати час дозвону", "Випадковий вибір із групи", "", ""],
    ["Вибрати потрібне правило сценарію", "801", "", ""],
    ["Вказати назву групи", "30 секунд", "", ""],
    ["Голосове повідомлення Чекайте", "Стандартне українською", "", ""],
    ["", "Дзвінок на внутрішню лінію", "", ""], ["", "901000", "", ""],
    ["", "35 секунд", "", ""],
    ["Голосове повідомлення Вибачте", "Стандартне українською", "", ""],
    ["Голосове повідомлення Неробочий час", "", "Стандартне повідомлення", ""],
    ["Голосове повідомлення Вихідний день", "", "", "Стандартне повідомлення"],
    ["5.1. Запасні номери"], ["6. Маршрути для вихідних дзвінків"],
    ["7. E-mail для отримання"], ["8. Голосові повідомлення"],
    ["8.1. Голосові повідомлення Feedback"], ["", "Загальна"],
    ["Голосове повідомлення Feedback початок", "Стандартне Соловйова УКР"],
    ["Питання від 1-5", "Стандартне Соловйова УКР"],
    ["Запитання Вибір зі списку", "Не потрібно"],
    ["Голосове повідомлення Feedback подяка", "Стандартне Соловйова УКР"],
    ["9. CRM для інтеграції"],
]


class PythonParserTest(unittest.TestCase):
    def setUp(self):
        self.result = parse_tz_snapshot(ROWS)
        self.patch = self.result["patch"]

    def test_company_and_gsm(self):
        self.assertEqual(self.patch["tariff"], "Pro+")
        self.assertEqual(self.patch["region"], "Україна")
        self.assertEqual(self.patch["language"], "ua")
        self.assertEqual([item["number"] for item in self.patch["gsmNumberItems"]], ["0689999998", "0739999998"])
        self.assertTrue(self.patch["gsmNumberItems"][0]["createTemporary"])
        self.assertFalse(self.patch["gsmNumberItems"][1]["createTemporary"])
        self.assertFalse(any(item["operatorDependency"] for item in self.patch["gsmNumberItems"]))
        self.assertEqual(self.patch["externallyProvisionedNumbers"], "")

    def test_endpoint_dependencies(self):
        self.assertEqual([item["number"] for item in self.patch["endpointRows"]], ["901000", "902000"])
        self.assertEqual(self.patch["ringGroupItems"][0]["endpoints"], ["901000", "902000"])
        self.assertEqual(self.patch["departmentItems"][0]["endpoints"], ["901000", "902000"])
        self.assertNotIn("endpoints", self.result["issues"])
        self.assertNotIn("ringGroups", self.result["issues"])
        self.assertNotIn("departments", self.result["issues"])

    def test_explicit_no_groups_is_not_a_parser_error(self):
        no_groups = [list(row) for row in ROWS]
        number_row = next(index for index, row in enumerate(no_groups) if row and row[0] == "Вкажіть номери груп")
        no_groups[number_row][1] = "не потрібно"
        no_groups[number_row + 2][1] = ""
        result = parse_tz_snapshot(no_groups)
        self.assertNotIn("ringGroups", result["issues"])

    def test_feedback_scenarios_and_schedule(self):
        self.assertEqual(self.patch["feedbackItems"][0]["speaker"], "usolovyova")
        working = self.patch["scenarioItems"][0]
        self.assertEqual(working["feedbackName"], "Загальна")
        self.assertEqual(working["actions"], [
            {"type": "voice", "voiceKey": "ua_usolovyova_greeting-with-feedback-appeal-v1"},
            {"type": "ringGroup", "target": "801", "timeout": "30"},
            {"type": "voice", "voiceKey": "ua_waiting"},
            {"type": "endpoint", "target": "901000", "timeout": "35"},
            {"type": "voice", "voiceKey": "ua_sorryvm"},
        ])
        schedule = self.patch["scheduleItems"][0]
        self.assertEqual(schedule["incomingNumbers"], ["0689999998", "0739999998"])
        self.assertEqual(schedule["rules"][0]["rule"], "10:00-20:00,mon,tue,wed,thu,fri,sat,*,*")
        self.assertEqual(schedule["rules"][1]["rule"], "*,sun,*,*")
        self.assertNotIn("scenarios", self.result["issues"])

    def test_real_cross_block_error_is_reported(self):
        broken = [list(row) for row in ROWS]
        endpoint_target_row = next(index for index, row in enumerate(broken) if row == ["", "901000", "", ""])
        broken[endpoint_target_row][1] = "903"
        result = parse_tz_snapshot(broken)
        self.assertIn("ВЛ 903 відсутня", result["issues"]["scenarios"])


if __name__ == "__main__":
    unittest.main()
