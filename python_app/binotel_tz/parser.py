from __future__ import annotations

import re
from typing import Any, Iterable


TARIFFS = (
    "Unknown", "Lite", "Pro", "Pro+", "Enterprise", "Phone number", "Pro SOHO",
    "Pro Wire", "Pro Wire One", "Bookon", "Bookon One", "Chat", "Feedback",
    "SmartCRM", "OnlineKasa", "RestoApp",
)

BLOCKS = (
    ("company", "1"), ("endpoints", "2"), ("ringGroups", "3"),
    ("gsmNumbers", "4"), ("departments", "5"), ("voiceMessages", "6"),
    ("scenarios", "7"), ("feedback", "8.1"), ("block11", "11"),
)

SPEAKERS = {
    "opisarenko": (re.compile(r"писаренко|pysarenko|pisarenko", re.I), "ua_opisarenko"),
    "usolovyova": (re.compile(r"солов[йь]?ова|solovyova", re.I), "ua_usolovyova"),
    "dslobodenyuk": (re.compile(r"слободенюк|slobodenyuk", re.I), "ua_dslobodenyuk"),
}


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def norm(value: Any) -> str:
    return clean(value).lower().replace("ё", "е")


def row_text(row: Iterable[Any]) -> str:
    return norm(" | ".join(str(cell or "") for cell in row))


def find_row(rows: list[list[str]], pattern: str, start: int = 0, end: int | None = None) -> int:
    regex = re.compile(pattern, re.I)
    limit = len(rows) if end is None else min(len(rows), end)
    for index in range(max(0, start), limit):
        if regex.search(row_text(rows[index])):
            return index
    return -1


def find_cell(row: list[str], pattern: str) -> int:
    regex = re.compile(pattern, re.I)
    return next((index for index, cell in enumerate(row) if regex.search(norm(cell))), -1)


def next_value(row: list[str], label_index: int) -> str:
    return next((clean(cell) for cell in row[label_index + 1 :] if clean(cell)), "")


def digits(value: Any) -> str:
    return re.sub(r"\D", "", str(value or ""))


def normalize_phone(value: Any) -> str:
    value = digits(value)
    if value.startswith("0038"):
        value = value[2:]
    return value if len(value) >= 10 else ""


def phones(value: Any) -> list[str]:
    found = re.findall(r"(?:\+?38\d{10}|0\d{9})", str(value or ""))
    return unique(normalize_phone(item) for item in found if normalize_phone(item))


def numbers(value: Any) -> list[str]:
    result: list[str] = []
    for part in re.split(r"[,;\n]+", str(value or "")):
        part = clean(part)
        match = re.fullmatch(r"(\d{3,})\s*[-–—]\s*(\d{3,})", part)
        if match:
            first, last = map(int, match.groups())
            if first <= last and last - first <= 100:
                result.extend(str(item) for item in range(first, last + 1))
            continue
        if re.fullmatch(r"\d{3,}", part):
            result.append(part)
    return unique(result)


def unique(values: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(values))


def placeholder(value: Any) -> bool:
    return bool(re.search(r"^(ні|нет|no)$|укаж(е|ет) сама|вкаже сама|не потребує налаштування|не потрібн", norm(value)))


def language_code(value: Any) -> str:
    value = norm(value)
    for pattern, code in ((r"укра", "ua"), (r"рус|рос", "ru"), (r"англ|english", "en"),
                          (r"поль|polsk", "pl"), (r"ісп|исп|espa", "es"),
                          (r"нім|нем|deutsch", "de"), (r"груз|georg", "ge")):
        if re.search(pattern, value):
            return code
    return ""


def speaker_from_text(value: Any) -> str:
    return next((key for key, (pattern, _prefix) in SPEAKERS.items() if pattern.search(clean(value))), "")


def voice_key(value: Any, feedback_speaker: str = "") -> str:
    value = norm(value)
    if not re.search(r"голосове|повідомлення|робоч|неробоч|вихідн|вибачте|чекайте|feedback|фідбек", value):
        return ""
    if "вибачте" in value:
        return "ua_sorryvm"
    if re.search(r"чекайте|очікуван", value):
        return "ua_waiting"
    if "вихідн" in value:
        return "ua_weekend"
    if "неробоч" in value:
        return "ua_off-hoursvm"
    if re.search(r"feedback|фідбек|заклик", value) and not re.search(r"без\s*(feedback|фідбек)", value):
        speaker = speaker_from_text(value) or feedback_speaker or "dslobodenyuk"
        return f"{SPEAKERS[speaker][1]}_greeting-with-feedback-appeal-v1"
    if "робоч" in value:
        return "ua_greeting"
    return ""


DAY_ALIASES = ((r"пн|mon", "mon"), (r"вт|tue", "tue"), (r"ср|wed", "wed"),
               (r"чт|thu", "thu"), (r"пт|fri", "fri"), (r"сб|sat", "sat"),
               (r"нд|неділя|вс|воскресенье|sun", "sun"))


def parse_days(value: Any) -> list[str]:
    value = re.sub(r"\s+", "", norm(value))
    order = [day for _pattern, day in DAY_ALIASES]
    parts = [part for part in re.split(r"[-–—]", value) if part]
    if len(parts) == 2:
        start = next((day for pattern, day in DAY_ALIASES if re.match(pattern, parts[0])), "")
        end = next((day for pattern, day in DAY_ALIASES if re.match(pattern, parts[1])), "")
        if start and end and order.index(end) >= order.index(start):
            return order[order.index(start) : order.index(end) + 1]
    return [day for pattern, day in DAY_ALIASES if re.search(pattern, value)]


def _section_rows(rows: list[list[str]]) -> dict[str, int]:
    return {
        "numbers": find_row(rows, r"1\.\s*номери компанії"),
        "endpoints": find_row(rows, r"2\.\s*внутрішні лінії"),
        "departments": find_row(rows, r"3\.\s*відділи"),
        "groups": find_row(rows, r"4\.\s*групи співробітників"),
        "scenarios": find_row(rows, r"5\.\s*сценарії для вхідних"),
        "backup": find_row(rows, r"5\.1\.\s*запасні номери"),
        "routes": find_row(rows, r"6\.\s*маршрути для вихідних"),
        "routes_end": find_row(rows, r"6\.1\s*автообробка"),
        "access": find_row(rows, r"7\.\s*e-mail для отримання"),
        "voices": find_row(rows, r"8\.\s*голосові повідомлення"),
        "feedback": find_row(rows, r"8\.1\.\s*голосові повідомлення\s*feedback"),
        "voices_end": find_row(rows, r"9\.\s*(сrm|crm)"),
        "block11": find_row(rows, r"11\.\s*тимчасове альфа ім['’]?я"),
        "block12": find_row(rows, r"12\.\s*getcall"),
    }


def parse_tz_snapshot(source_rows: list[list[Any]], current_block_states: dict[str, Any] | None = None) -> dict[str, Any]:
    rows = [[clean(cell) for cell in (row or [])] for row in (source_rows or [])]
    section = _section_rows(rows)
    issues: dict[str, str] = {}
    patch: dict[str, Any] = {
        "endpointRows": [], "ringGroupItems": [], "gsmNumberItems": [], "departmentItems": [],
        "scenarioItems": [], "scheduleItems": [], "feedbackItems": [],
        "standardVoiceMessages": "", "manualRouteInstructions": "",
    }

    head_end = section["numbers"] if section["numbers"] >= 0 else min(len(rows), 12)
    header = [cell for row in rows[:head_end] for cell in row]
    tariff = next((canonical for cell in header for canonical in TARIFFS
                   if norm(cell).replace(" ", "") == norm(canonical).replace(" ", "")), "")
    region_row = find_row(rows, r"(?:^|\| )регіон(?: \||$)", 0, head_end)
    language_row = find_row(rows, r"мова mybusiness", 0, head_end)
    region = next_value(rows[region_row], find_cell(rows[region_row], r"^регіон$")) if region_row >= 0 else ""
    language = language_code(next_value(rows[language_row], find_cell(rows[language_row], r"мова mybusiness"))) if language_row >= 0 else ""
    if tariff:
        patch["tariff"] = tariff
    if region:
        patch["region"] = region
    if language:
        patch["language"] = language
    patch.update(skipCompanyParams=False, regionNotImportant=False)
    missing = [name for value, name in ((tariff, "пакет"), (region, "регіон"), (language, "мова MyBusiness")) if not value]
    if missing:
        issues["company"] = f"Не розпізнано: {', '.join(missing)}."

    number_end = section["endpoints"] if section["endpoints"] >= 0 else len(rows)
    phone_row = find_row(rows, r"номери телефонів.*форматі", section["numbers"] + 1, number_end)
    name_row = find_row(rows, r"підписати номер у лк як", section["numbers"] + 1, number_end)
    connection_row = find_row(rows, r"дані для підключення номера", section["numbers"] + 1, number_end)
    if phone_row >= 0:
        label_column = find_cell(rows[phone_row], r"номери телефонів.*форматі")
        for column, cell in enumerate(rows[phone_row]):
            if column <= label_column:
                continue
            for phone in phones(cell):
                connection = rows[connection_row][column] if connection_row >= 0 and column < len(rows[connection_row]) else ""
                raw_name = rows[name_row][column] if name_row >= 0 and column < len(rows[name_row]) else ""
                safe_name = raw_name if len(raw_name) <= 80 and not re.search(r"sip[-\s]?(логін|логин|парол)|безпека|безопасность|тип підключення|тип подключения", raw_name, re.I) else ""
                patch["gsmNumberItems"].append({
                    "number": phone, "name": safe_name, "email": "",
                    "createTemporary": bool(re.search(r"встановлен\S*\s+пізніше|буде\s+встановлен\S*\s+пізніше|установлен\S*\s+позже", connection, re.I)),
                    "operatorDependency": bool(re.search(r"оператор.*додає.*самостійно|оператор.*добавляет.*самостоятельно", connection, re.I)),
                })
    if section["numbers"] < 0:
        issues["gsmNumbers"] = "Не знайдено розділ 1 з номерами компанії."
    elif not patch["gsmNumberItems"]:
        issues["gsmNumbers"] = "Розділ номерів знайдено, але жодного номера не розпізнано."
    patch["externallyProvisionedNumbers"] = ", ".join(item["number"] for item in patch["gsmNumberItems"] if item["operatorDependency"])
    patch["createTemporaryNumbers"] = any(item["createTemporary"] for item in patch["gsmNumberItems"])

    endpoint_end = section["departments"] if section["departments"] >= 0 else len(rows)
    endpoint_number_row = find_row(rows, r"вкажіть нумерацію внутрішніх ліній", section["endpoints"] + 1, endpoint_end)
    endpoint_name_row = find_row(rows, r"ім['’]?я та прізвище співробітника", section["endpoints"] + 1, endpoint_end)
    endpoint_email_row = find_row(rows, r"e-mail співробітника", section["endpoints"] + 1, endpoint_end)
    endpoint_phone_row = find_row(rows, r"контактний номер телефону співробітника", section["endpoints"] + 1, endpoint_end)
    if endpoint_number_row >= 0:
        for column, cell in enumerate(rows[endpoint_number_row]):
            for number in numbers(cell):
                name = rows[endpoint_name_row][column] if endpoint_name_row >= 0 and column < len(rows[endpoint_name_row]) else ""
                email = rows[endpoint_email_row][column] if endpoint_email_row >= 0 and column < len(rows[endpoint_email_row]) else ""
                mobile = normalize_phone(rows[endpoint_phone_row][column]) if endpoint_phone_row >= 0 and column < len(rows[endpoint_phone_row]) else ""
                create_access = bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)) and not placeholder(name)
                patch["endpointRows"].append({
                    "number": number, "createAccess": create_access,
                    "accessName": name if create_access else "", "email": email if create_access else "",
                    "mobilePhoneNumber": mobile if create_access else "", "role": "employee",
                    "accessNote": "" if create_access else ("; ".join(filter(None, (name, email))) or "Дані доступу не вказані в ТЗ"),
                })
    if section["endpoints"] < 0:
        issues["endpoints"] = "Не знайдено розділ 2 з внутрішніми лініями."
    elif not patch["endpointRows"]:
        issues["endpoints"] = "Розділ ВЛ знайдено, але номери ліній не розпізнано."

    department_end = section["groups"] if section["groups"] >= 0 else len(rows)
    department_number_row = find_row(rows, r"^номери(\s|\|)", section["departments"] + 1, department_end)
    department_lines_row = find_row(rows, r"^лінії(\s|\|)", section["departments"] + 1, department_end)
    department_name_row = department_number_row - 1 if department_number_row > section["departments"] else -1
    if department_name_row >= 0:
        width = max(len(rows[department_name_row]), len(rows[department_number_row]), len(rows[department_lines_row]) if department_lines_row >= 0 else 0)
        for column in range(1, width):
            name = rows[department_name_row][column] if column < len(rows[department_name_row]) else ""
            if not name or re.fullmatch(r"номери|лінії", name, re.I):
                continue
            patch["departmentItems"].append({
                "name": name,
                "phoneNumbers": phones(rows[department_number_row][column]) if column < len(rows[department_number_row]) else [],
                "endpoints": numbers(rows[department_lines_row][column]) if department_lines_row >= 0 and column < len(rows[department_lines_row]) else [],
            })
    if section["departments"] < 0:
        issues["departments"] = "Не знайдено розділ 3 з відділами."
    elif not patch["departmentItems"]:
        issues["departments"] = "Розділ відділів знайдено, але відділи не розпізнано."

    group_end = section["scenarios"] if section["scenarios"] >= 0 else len(rows)
    group_number_row = find_row(rows, r"вкажіть номери груп", section["groups"] + 1, group_end)
    group_name_row = find_row(rows, r"вкажіть назву групи", section["groups"] + 1, group_end)
    group_lines_row = find_row(rows, r"внутрішні номери працівників", section["groups"] + 1, group_end)
    if group_number_row >= 0:
        for column, cell in enumerate(rows[group_number_row]):
            for number in numbers(cell):
                patch["ringGroupItems"].append({
                    "number": number,
                    "name": rows[group_name_row][column] if group_name_row >= 0 and column < len(rows[group_name_row]) else "",
                    "endpoints": numbers(rows[group_lines_row][column]) if group_lines_row >= 0 and column < len(rows[group_lines_row]) else [],
                })
    if section["groups"] < 0:
        issues["ringGroups"] = "Не знайдено розділ 4 з групами."
    elif not patch["ringGroupItems"]:
        issues["ringGroups"] = "Розділ груп знайдено, але групи не розпізнано."

    feedback_speaker = ""
    if section["feedback"] >= 0:
        feedback_end = section["voices_end"] if section["voices_end"] >= 0 else len(rows)
        beginning = find_row(rows, r"feedback\s*початок", section["feedback"] + 1, feedback_end)
        csat = find_row(rows, r"питання\s*від\s*1\s*[-–—]\s*5|оцінк.*1\s*[-–—]\s*5", section["feedback"] + 1, feedback_end)
        select = find_row(rows, r"вибір\s*зі\s*списку|що\s*слід\s*покращити", section["feedback"] + 1, feedback_end)
        thanks = find_row(rows, r"feedback\s*подяк|feedback\s*вдяч", section["feedback"] + 1, feedback_end)
        name_end = beginning if beginning >= 0 else min(section["feedback"] + 5, feedback_end)
        name_row = next((idx for idx in range(section["feedback"] + 1, name_end)
                         if any(clean(cell) and not placeholder(cell) and not speaker_from_text(cell) for cell in rows[idx][1:])), -1)
        width = max((len(row) for row in rows[section["feedback"]:feedback_end]), default=1)
        for column in range(1, width):
            name = rows[name_row][column] if name_row >= 0 and column < len(rows[name_row]) else ""
            if not name or placeholder(name) or re.search(r"вкажи\s*назву", name, re.I):
                continue
            samples = [rows[index][column] for index in (beginning, csat, select, thanks) if index >= 0 and column < len(rows[index])]
            speaker = speaker_from_text(" ".join(samples))
            select_value = rows[select][column] if select >= 0 and column < len(rows[select]) else ""
            include_select = bool(select_value and not placeholder(select_value) and not re.search(r"не\s*потріб|не\s*нуж", norm(select_value)))
            patch["feedbackItems"].append({"key": f"feedback-{len(patch['feedbackItems']) + 1}", "name": name, "speaker": speaker, "includeSelect": include_select})
            feedback_speaker = feedback_speaker or speaker
            if not speaker:
                issues["feedback"] = f'Feedback "{name}": не розпізнано диктора.'
            if min(beginning, csat, thanks) < 0:
                issues["feedback"] = f'Feedback "{name}": не знайдено всі обов’язкові рядки початку, CSAT і подяки.'
        if not patch["feedbackItems"]:
            issues["feedback"] = "Розділ 8.1 знайдено, але Feedback-об’єкти не розпізнано."

    voice_end = section["feedback"] if section["feedback"] >= 0 else (section["voices_end"] if section["voices_end"] >= 0 else len(rows))
    voice_keys: list[str] = []
    if section["voices"] >= 0:
        for index in range(section["voices"] + 1, voice_end):
            if not re.search(r"стандарт.*укра", row_text(rows[index])):
                continue
            key = voice_key(" ".join(rows[index]), feedback_speaker)
            if key and "greeting-with-feedback-appeal" not in key:
                voice_keys.append(key)
    else:
        issues["voiceMessages"] = "Не знайдено розділ 8 з голосовими повідомленнями."

    scenario_end = section["backup"] if section["backup"] >= 0 else (section["routes"] if section["routes"] >= 0 else len(rows))
    scenario_name_row = find_row(rows, r"робочий час|неробочий час", section["scenarios"] + 1, scenario_end)
    scenario_number_row = scenario_name_row + 1 if scenario_name_row >= 0 else -1
    if scenario_name_row >= 0:
        for column in range(1, len(rows[scenario_name_row])):
            name = rows[scenario_name_row][column]
            if not name or re.match(r"сценарій\s*\d+", name, re.I):
                continue
            actions: list[dict[str, str]] = []
            pending_type = ""
            pending_index = -1
            for index in range(scenario_number_row + 1, scenario_end):
                value = rows[index][column] if column < len(rows[index]) else ""
                if not value:
                    continue
                context = f"{rows[index][0] if rows[index] else ''} {value}"
                key = voice_key(context, feedback_speaker if len(patch["feedbackItems"]) == 1 else "")
                if re.search(r"голосове повідомлення|привітання|feedback|фідбек", context, re.I) and key:
                    actions.append({"type": "voice", "voiceKey": key})
                    if "greeting-with-feedback-appeal" not in key:
                        voice_keys.append(key)
                    pending_type, pending_index = "", -1
                    continue
                call = re.search(r"(?:дзвінок|виклик)\D{0,15}(\d{3,})", value, re.I)
                if call:
                    target = call.group(1)
                    action_type = "ringGroup" if any(item["number"] == target for item in patch["ringGroupItems"]) else "endpoint"
                    actions.append({"type": action_type, "target": target, "timeout": "40"})
                    pending_index = len(actions) - 1
                    continue
                if re.search(r"випадковий вибір із групи|дзвінок на групу|груповий виклик", value, re.I):
                    pending_type, pending_index = "ringGroup", -1
                    continue
                if re.search(r"дзвінок на внутрішню лінію|виклик внутрішньої лінії", value, re.I):
                    pending_type, pending_index = "endpoint", -1
                    continue
                if pending_type and re.fullmatch(r"\d{3,}", digits(value)):
                    actions.append({"type": pending_type, "target": digits(value), "timeout": "40"})
                    pending_type, pending_index = "", len(actions)
                    pending_index -= 1
                    continue
                seconds = re.match(r"^(\d{1,3})\s*(?:сек|с\.?$)", value, re.I)
                if pending_index >= 0 and seconds:
                    actions[pending_index]["timeout"] = seconds.group(1)
                    pending_index = -1
            incoming = phones(rows[scenario_number_row][column]) if scenario_number_row >= 0 and column < len(rows[scenario_number_row]) else []
            if not actions and not incoming:
                continue
            uses_feedback = any("greeting-with-feedback-appeal" in action.get("voiceKey", "") for action in actions)
            feedback_name = patch["feedbackItems"][0]["name"] if uses_feedback and len(patch["feedbackItems"]) == 1 else ""
            if uses_feedback and len(patch["feedbackItems"]) != 1:
                issues["scenarios"] = f'Сценарій "{name}" використовує Feedback, але однозначний об’єкт з блока 8.1 не визначено.'
            patch["scenarioItems"].append({
                "key": f"scenario-{len(patch['scenarioItems']) + 1}", "name": name,
                "type": "offHours" if re.search(r"неробоч|вихідн|выходн|аварійн|аварийн", norm(name)) else "working",
                "feedbackName": feedback_name, "actions": actions, "incomingNumbers": incoming,
            })

    work_schedule_row = find_row(rows, r"^графік роботи|графік роботи \|", section["numbers"] + 1, section["endpoints"] if section["endpoints"] >= 0 else len(rows))
    if work_schedule_row >= 0 and patch["scenarioItems"]:
        working = next((item for item in patch["scenarioItems"] if item["type"] == "working"), patch["scenarioItems"][0])
        off_hours = next((item for item in patch["scenarioItems"] if item["type"] == "offHours"), None)
        weekend = next((item for item in patch["scenarioItems"] if re.search(r"вихідн|выходн", norm(item["name"]))), None)
        rules: list[dict[str, Any]] = []
        for index in range(work_schedule_row + 1, section["endpoints"]):
            for column, value in enumerate(rows[index]):
                header = (rows[index - 1][column] if column < len(rows[index - 1]) else "") or (rows[index][column - 1] if column > 0 else "")
                days = parse_days(header)
                time = re.search(r"(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})", value)
                if time and days:
                    start = time.group(1).zfill(5)
                    end = time.group(2).zfill(5)
                    rules.append({"start": start, "end": end, "days": days, "scenarioName": working["name"], "rule": f"{start}-{end},{','.join(days)},*,*"})
                elif re.search(r"вихідн|выходн", norm(value)) and days and weekend:
                    rules.append({"start": "", "end": "", "allDay": True, "days": days, "scenarioName": weekend["name"], "rule": f"*,{','.join(days)},*,*"})
        incoming = unique(number for item in patch["scenarioItems"] for number in item.get("incomingNumbers", []))
        patch["scheduleItems"].append({
            "name": "Графік роботи", "mode": "custom" if rules else "always", "rules": rules,
            "fallbackScenarioName": (off_hours or working)["name"], "incomingNumbers": incoming,
        })
    if section["scenarios"] < 0:
        issues["scenarios"] = "Не знайдено розділ 5 зі сценаріями."
    elif not patch["scenarioItems"]:
        issues["scenarios"] = "Розділ сценаріїв знайдено, але сценарії не розпізнано."
    elif any(not item["actions"] for item in patch["scenarioItems"]):
        issues["scenarios"] = "Без дій: " + ", ".join(item["name"] for item in patch["scenarioItems"] if not item["actions"]) + "."
    patch["standardVoiceMessages"] = "\n".join(unique(voice_keys))

    if section["routes"] >= 0:
        patch["manualRouteInstructions"] = "Виконати вихідні маршрути вручну відповідно до блока 6 ТЗ."

    if section["block11"] >= 0:
        end = section["block12"] if section["block12"] >= 0 else len(rows)
        use_row = find_row(rows, r"чи буде клієнт використовувати альфа ім['’]?я binsms", section["block11"], end)
        label = find_cell(rows[use_row], r"чи буде клієнт використовувати") if use_row >= 0 else -1
        value = next_value(rows[use_row], label) if use_row >= 0 else ""
        patch.update(block11Enabled=bool(re.fullmatch(r"так|да|yes", norm(value))), block11AlphaName="BinSMS", block11Gateway="Binotel")
    else:
        issues["block11"] = "Не знайдено розділ 11 з тимчасовим альфа-іменем."

    endpoint_set = {item["number"] for item in patch["endpointRows"]}
    gsm_set = {item["number"] for item in patch["gsmNumberItems"]}
    group_set = {item["number"] for item in patch["ringGroupItems"]}
    for group in patch["ringGroupItems"]:
        missing = [item for item in group["endpoints"] if item not in endpoint_set]
        if missing:
            issues["ringGroups"] = f"Група {group['number']} містить ВЛ, яких немає у блоці 2: {', '.join(missing)}."
    for department in patch["departmentItems"]:
        missing_endpoints = [item for item in department["endpoints"] if item not in endpoint_set]
        missing_phones = [item for item in department["phoneNumbers"] if item not in gsm_set]
        if missing_endpoints or missing_phones:
            details = []
            if missing_endpoints:
                details.append(f"ВЛ: {', '.join(missing_endpoints)}")
            if missing_phones:
                details.append(f"номери: {', '.join(missing_phones)}")
            issues["departments"] = f"Відділ «{department['name']}» має відсутні залежності ({'; '.join(details)})."
    for scenario in patch["scenarioItems"]:
        for action in scenario["actions"]:
            if action["type"] == "endpoint" and action["target"] not in endpoint_set:
                issues["scenarios"] = f"Сценарій «{scenario['name']}»: ВЛ {action['target']} відсутня у блоці 2."
            if action["type"] == "ringGroup" and action["target"] not in group_set:
                issues["scenarios"] = f"Сценарій «{scenario['name']}»: група {action['target']} відсутня у блоці 3."
    for schedule in patch["scheduleItems"]:
        if not schedule["incomingNumbers"]:
            issues["scenarios"] = f"Графік «{schedule['name']}»: не розпізнано вхідний номер."
        elif any(number not in gsm_set for number in schedule["incomingNumbers"]):
            issues["scenarios"] = f"Графік «{schedule['name']}»: вхідний номер відсутній у блоці 4."

    current_block_states = current_block_states or {}
    states = {}
    for block_id, _number in BLOCKS:
        previous = current_block_states.get(block_id) or {}
        ignored = bool(previous.get("ignored"))
        states[block_id] = {"ignored": ignored, "issue": "" if ignored else issues.get(block_id, "")}
    return {"apiVersion": 1, "patch": patch, "blockStates": states, "issues": issues}
