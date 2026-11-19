"""refine open_to_africa and visa_sponsorship rules (region locks, negation, relocation)"""
from alembic import op

revision = "20261118_job_regions_v2"
#down_revision = "20261106_job_regions"
down_revision = "f2b8d4a60c31"
branch_labels = None
depends_on = None

# ── frozen copy of app/models/job_region_sql.py (v2) ─────────────────────
# Never import the app module here: this migration must keep meaning the same
# thing after the model's rules change again. A new rule change = a new migration.
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

_REGION = (
    r"\m(united states|united kingdom|u\.?s\.?a?|u\.?k\.?|eu|canada|europe|"
    r"european union|north america|latam|latin america|apac|australia|india)\M"
)

_REGION_LOCK = (
    rf"({_REGION}\.?[ -]*(only|based|residents?|citizens?)\M"
    rf"|\m(must|should|need to|needs to|required to)\M[^.]{{0,30}}"
    rf"\m(located|based|reside|residing|live|living)\M[^.]{{0,15}}\m(in|within)\M( the)? {_REGION}"
    rf"|\m(authori[sz]ed|eligible|permitted|legally entitled)\M to work[^.]{{0,15}}\m(in|within)\M( the)? {_REGION}"
    rf"|\manywhere (in|within)( the)? {_REGION}"
    rf"|\manywhere (in|within) (the|your|that) (country|state|province|region|continent)\M)"
)
_LOC_REGION_LOCK = rf"(\mremote\M[^a-z]{{0,6}}{_REGION}|{_REGION}[^a-z]{{0,6}}\mremote\M)"

WORLDWIDE_LOC = r"\m(worldwide|world.?wide|anywhere|global|globally)\M"
WORLDWIDE_DESC = (
    r"(\mwork(ing)? (remotely )?from anywhere\M|\manywhere in the world\M|"
    r"\m(hire|hiring|candidates?|applicants?|team members|talent|employees)\M[^.]{0,60}"
    r"\m(worldwide|globally|around the (world|globe))\M|"
    r"\mremote[^.]{0,20}\m(worldwide|globally)\M)"
)
AFRICA_HIRING = (
    rf"(\m(open to|hiring (in|from)|candidates? (from|in|based in|located in|across)|"
    rf"applicants? (from|in|based in)|residents of|eligible to work in)\M[^.]{{0,40}}\m({_AFRICA_NAMES})\M"
    rf"|\mafrica(n)?[ -]based\M|\mafrica(n)? time ?zones?\M)"
)

VISA_POS = (
    r"(\m(visa|work permit|work visa|employment visa|immigration) sponsorship"
    r"|\msponsor(s|ing)?\M[^.]{0,15}\m(work |employment )?(visas?|work permits?)\M"
    r"|\mh.?1.?b\M[^.]{0,15}\msponsor"
    r"|\m(offer|offers|offering|provide|provides|providing|including)\M[^.]{0,20}"
    r"\m(visa|immigration|work permit) (support|assistance|sponsorship))"
)
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

# ── frozen v1 rules (from 20261106_job_regions), used by downgrade() ─────
_V1_AFRICA_PLACES = (
    r"\m(africa|kenya|nigeria|ghana|uganda|tanzania|rwanda|ethiopia|egypt|morocco|tunisia|"
    r"algeria|senegal|cameroon|zambia|zimbabwe|botswana|namibia|mauritius|ivory coast|"
    r"nairobi|lagos|abuja|accra|kigali|kampala|cairo|casablanca|johannesburg|cape town|"
    r"durban|pretoria|dar es salaam|addis ababa|tunis|dakar|abidjan|lusaka|harare|"
    r"gaborone|windhoek)\M"
)
_V1_WORLDWIDE_LOC = r"\m(worldwide|world.?wide|anywhere|global|globally)\M"
_V1_AFRICA_DESC = (
    r"(work(ing)? from anywhere|anywhere in the world|"
    r"(open|hiring|candidates?|applicants?|applications?)[^.]{0,40}\mafrica\M|"
    r"\mafrica\M[^.]{0,40}(remote|time ?zone|candidates?)|"
    r"remote[^.]{0,20}\m(worldwide|globally|anywhere)\M)"
)
_V1_VISA_POS = (
    r"((visa|work permit)[^.]{0,25}sponsor|sponsor[^.]{0,25}(visa|work permit)|"
    r"relocation (assistance|support|package|allowance|bonus)|we (will )?provide visa)"
)
_V1_VISA_NEG = (
    r"\m(no|not|unable to|cannot|can.t|won.t|without|doesn.t|does not|do not|don.t|"
    r"will not|not able to)\M[^.]{0,30}(visa|sponsor)"
)
_V1_OPEN_TO_AFRICA_SQL = (
    f"({_LOC} ~ '{_V1_AFRICA_PLACES}') OR ({_REMOTE} AND "
    f"({_LOC} ~ '{_V1_WORLDWIDE_LOC}' OR {_DESC} ~ '{_V1_AFRICA_DESC}'))"
)
_V1_VISA_SPONSORSHIP_SQL = f"({_DESC} ~ '{_V1_VISA_POS}') AND NOT ({_DESC} ~ '{_V1_VISA_NEG}')"


def _rebuild(open_sql: str, visa_sql: str) -> None:
    # A generated column's expression can't be altered in place before Postgres 17,
    # so drop and re-add. One ALTER adds both columns, so the table is rewritten once
    # (brief exclusive lock). All of this runs inside Alembic's transaction.
    op.execute("DROP INDEX IF EXISTS ix_jobs_visa_sponsorship")
    op.execute("DROP INDEX IF EXISTS ix_jobs_open_to_africa")
    op.execute("ALTER TABLE jobs DROP COLUMN IF EXISTS visa_sponsorship, DROP COLUMN IF EXISTS open_to_africa")
    op.execute(
        "ALTER TABLE jobs "
        f"ADD COLUMN open_to_africa boolean GENERATED ALWAYS AS ({open_sql}) STORED, "
        f"ADD COLUMN visa_sponsorship boolean GENERATED ALWAYS AS ({visa_sql}) STORED"
    )
    op.execute("CREATE INDEX ix_jobs_open_to_africa ON jobs (id) WHERE open_to_africa")
    op.execute("CREATE INDEX ix_jobs_visa_sponsorship ON jobs (id) WHERE visa_sponsorship")


def upgrade() -> None:
    _rebuild(OPEN_TO_AFRICA_SQL, VISA_SPONSORSHIP_SQL)


def downgrade() -> None:
    _rebuild(_V1_OPEN_TO_AFRICA_SQL, _V1_VISA_SPONSORSHIP_SQL)