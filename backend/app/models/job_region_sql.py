# backend/app/models/job_region_sql.py
"""
SQL for the generated columns jobs.open_to_africa and jobs.visa_sponsorship.

Postgres ARE regexes (\\m = word start, \\M = word end) run against lower-cased text.
Rules for editing this file:
  * no single quotes (the patterns sit inside SQL string literals) - use "." instead
  * no "(?:" groups - SQLAlchemy would read ":word" as a bind parameter
A flag is True only when the listing says so; False means "not confirmed".
"""

# ── Africa ────────────────────────────────────────────────────────────────────
_AFRICA_NAMES = (
    "africa|african|algeria|angola|benin|botswana|burkina faso|burundi|cameroon|"
    "cape verde|congo|c.te d.ivoire|djibouti|egypt|eswatini|ethiopia|gabon|gambia|ghana|"
    "ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|"
    "morocco|mozambique|namibia|nigeria|rwanda|senegal|sierra leone|somalia|south sudan|"
    "sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe|"
    "nairobi|mombasa|kisumu|lagos|abuja|port harcourt|ibadan|accra|kumasi|kigali|kampala|"
    "entebbe|cairo|casablanca|rabat|johannesburg|cape town|durban|pretoria|sandton|"
    "stellenbosch|dar es salaam|arusha|addis ababa|tunis|dakar|abidjan|lusaka|harare|"
    "gaborone|windhoek|maputo|luanda|kinshasa|douala|antananarivo|port louis|khartoum"
)
AFRICA_PLACES = rf"\m({_AFRICA_NAMES})\M"

# Regions that make a "remote" role not open to Africa
_REGION = (
    r"\m(united states|united kingdom|u\.?s\.?a?|u\.?k\.?|eu|canada|europe|"
    r"european union|north america|latam|latin america|apac|australia|india)\M"
)

# Restrictions stated in a location or a description
_REGION_LOCK = (
    rf"({_REGION}\.?[ -]*(only|based|residents?|citizens?)\M"
    rf"|\m(must|should|need to|needs to|required to)\M[^.]{{0,30}}"
    rf"\m(located|based|reside|residing|live|living)\M[^.]{{0,15}}\m(in|within)\M( the)? {_REGION}"
    rf"|\m(authori[sz]ed|eligible|permitted|legally entitled)\M to work[^.]{{0,15}}\m(in|within)\M( the)? {_REGION}"
    rf"|\manywhere (in|within)( the)? {_REGION}"
    rf"|\manywhere (in|within) (the|your|that) (country|state|province|region|continent)\M)"
)
# "Remote - US", "Remote (Canada)", "United States (Remote)": checked on the location only
_LOC_REGION_LOCK = rf"(\mremote\M[^a-z]{{0,6}}{_REGION}|{_REGION}[^a-z]{{0,6}}\mremote\M)"

WORLDWIDE_LOC = r"\m(worldwide|world.?wide|anywhere|global|globally)\M"
WORLDWIDE_DESC = (
    r"(\mwork(ing)? (remotely )?from anywhere\M|\manywhere in the world\M|"
    r"\m(hire|hiring|candidates?|applicants?|team members|talent|employees)\M[^.]{0,60}"
    r"\m(worldwide|globally|around the (world|globe))\M|"
    r"\mremote[^.]{0,20}\m(worldwide|globally)\M)"
)
# Africa in a description counts only when phrased as who the employer hires
AFRICA_HIRING = (
    rf"(\m(open to|hiring (in|from)|candidates? (from|in|based in|located in|across)|"
    rf"applicants? (from|in|based in)|residents of|eligible to work in)\M[^.]{{0,40}}\m({_AFRICA_NAMES})\M"
    rf"|\mafrica(n)?[ -]based\M|\mafrica(n)? time ?zones?\M)"
)

# ── Visa / relocation ─────────────────────────────────────────────────────────
VISA_POS = (
    r"(\m(visa|work permit|work visa|employment visa|immigration) sponsorship"
    r"|\msponsor(s|ing)?\M[^.]{0,15}\m(work |employment )?(visas?|work permits?)\M"
    r"|\mh.?1.?b\M[^.]{0,15}\msponsor"
    r"|\m(offer|offers|offering|provide|provides|providing|including)\M[^.]{0,20}"
    r"\m(visa|immigration|work permit) (support|assistance|sponsorship))"
)
# negation before the keyword ("does not offer visa sponsorship") or after it
# ("visa sponsorship is not available")
VISA_NEG = (
    r"(\m(no|not|never|unable to|cannot|can.t|won.t|without|doesn.t|does not|do not|don.t|"
    r"will not|not able to|isn.t|aren.t)\M[^.]{0,30}(visa|sponsor|work permit)"
    r"|(visa|work permit|sponsorship)[^.]{0,30}"
    r"\m(not|unavailable|isn.t|cannot|can.t|unable|ineligible)\M)"
)
RELOC_POS = (
    r"(\mrelocation (assistance|support|package|allowance|bonus|benefits?|stipend|expenses|budget)\M"
    r"|\m(offer|offers|offering|provide|provides|providing)\M[^.]{0,15}\mrelocation\M"
    r"|\mrelocation (is )?(available|offered|provided|supported)\M)"
)
RELOC_NEG = (
    r"(\m(no|not|never|without|unable to|cannot|can.t|won.t|doesn.t|does not|do not|don.t|"
    r"will not)\M[^.]{0,30}\mrelocat"
    r"|\mrelocat[a-z]*[^.]{0,30}\m(not|unavailable|isn.t|cannot|can.t|unable)\M)"
)

# ── Column expressions ────────────────────────────────────────────────────────
_LOC = "lower(coalesce(location, ''))"
_DESC = "lower(coalesce(description, ''))"
_REMOTE = f"(lower(coalesce(remote_type, '')) = 'remote' OR {_LOC} ~ '\\mremote\\M')"

OPEN_TO_AFRICA_SQL = (
    f"({_LOC} ~ '{AFRICA_PLACES}')"
    f" OR ({_REMOTE} AND {_DESC} ~ '{AFRICA_HIRING}')"
    f" OR ({_REMOTE}"
    f" AND NOT ({_LOC} ~ '{_REGION_LOCK}' OR {_DESC} ~ '{_REGION_LOCK}' OR {_LOC} ~ '{_LOC_REGION_LOCK}')"
    f" AND ({_LOC} ~ '{WORLDWIDE_LOC}' OR {_DESC} ~ '{WORLDWIDE_DESC}'))"
)
VISA_SPONSORSHIP_SQL = (
    f"(({_DESC} ~ '{VISA_POS}') AND NOT ({_DESC} ~ '{VISA_NEG}'))"
    f" OR (({_DESC} ~ '{RELOC_POS}') AND NOT ({_DESC} ~ '{RELOC_NEG}'))"
)