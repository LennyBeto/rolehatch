AFRICA_PLACES = (
    r"\m(africa|kenya|nigeria|ghana|uganda|tanzania|rwanda|ethiopia|egypt|morocco|tunisia|"
    r"algeria|senegal|cameroon|zambia|zimbabwe|botswana|namibia|mauritius|ivory coast|"
    r"nairobi|lagos|abuja|accra|kigali|kampala|cairo|casablanca|johannesburg|cape town|"
    r"durban|pretoria|dar es salaam|addis ababa|tunis|dakar|abidjan|lusaka|harare|"
    r"gaborone|windhoek)\M"
)
WORLDWIDE_LOC = r"\m(worldwide|world.?wide|anywhere|global|globally)\M"
AFRICA_DESC = (
    r"(work(ing)? from anywhere|anywhere in the world|"
    r"(open|hiring|candidates?|applicants?|applications?)[^.]{0,40}\mafrica\M|"
    r"\mafrica\M[^.]{0,40}(remote|time ?zone|candidates?)|"
    r"remote[^.]{0,20}\m(worldwide|globally|anywhere)\M)"
)
VISA_POS = (
    r"((visa|work permit)[^.]{0,25}sponsor|sponsor[^.]{0,25}(visa|work permit)|"
    r"relocation (assistance|support|package|allowance|bonus)|we (will )?provide visa)"
)
VISA_NEG = (
    r"\m(no|not|unable to|cannot|can.t|won.t|without|doesn.t|does not|do not|don.t|"
    r"will not|not able to)\M[^.]{0,30}(visa|sponsor)"
)

_LOC = "lower(coalesce(location, ''))"
_DESC = "lower(coalesce(description, ''))"
_REMOTE = f"(lower(coalesce(remote_type, '')) = 'remote' OR {_LOC} ~ '\\mremote\\M')"

OPEN_TO_AFRICA_SQL = (
    f"({_LOC} ~ '{AFRICA_PLACES}') OR ({_REMOTE} AND "
    f"({_LOC} ~ '{WORLDWIDE_LOC}' OR {_DESC} ~ '{AFRICA_DESC}'))"
)
VISA_SPONSORSHIP_SQL = f"({_DESC} ~ '{VISA_POS}') AND NOT ({_DESC} ~ '{VISA_NEG}')"
