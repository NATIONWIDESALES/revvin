-- Normalise a slug: lowercase, drop hyphens, map leet substitutions.
CREATE OR REPLACE FUNCTION public.fn_normalize_slug(p_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(lower(replace(coalesce(p_slug, ''), '-', '')),
                   '0134578@$|!', 'oieastabsli')
$$;

CREATE OR REPLACE FUNCTION public.fn_slug_reserved_words()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'admin','api','auth','login','signin','signup','dashboard','welcome',
    'pricing','browse','marketplace','sample','terms','privacy','trust',
    'saved','i','r','offer','referrer','reset-password','for-businesses',
    'for-referrers','about-revvin-llm','referral-agreement','how-it-works',
    'feedback','print','docs','www','mail','ftp','cdn','static','assets',
    'app','help','support','status','blog','null','undefined','test'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION public.fn_slug_blocked_terms()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'revvin','revin','rewin','rewvin','revvn','revvinn',
    'official','verify','verification','verified','secure','security',
    'account','billing','payment','payments','password','refund','invoice',
    'stripe','paypal','wallet','login','signin','2fa','otp'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION public.fn_slug_profanity()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['acrotomophilia', 'alabamahotpocket', 'alaskanpipeline', 'anal', 'anilingus', 'anus', 'apeshit', 'arsehole', 'ass', 'asshole', 'assmunch', 'autoerotic', 'babeland', 'babybatter', 'babyjuice', 'ballgag', 'ballgravy', 'ballkicking', 'balllicking', 'ballsack', 'ballsucking', 'bangbros', 'bangbus', 'bareback', 'barelylegal', 'barenaked', 'bastard', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beaner', 'beaners', 'beastiality', 'beavercleaver', 'beaverlips', 'bestiality', 'bigblack', 'bigbreasts', 'bigknockers', 'bigtits', 'bimbos', 'birdlock', 'bitch', 'bitches', 'blackcock', 'blondeaction', 'blondeonblondeaction', 'blowjob', 'blowyourload', 'bluewaffle', 'blumpkin', 'bollocks', 'bondage', 'boner', 'boob', 'boobs', 'bootycall', 'brownshowers', 'brunetteaction', 'bukkake', 'bulldyke', 'bulletvibe', 'bullshit', 'bunghole', 'busty', 'butt', 'buttcheeks', 'butthole', 'cameltoe', 'camgirl', 'camslut', 'camwhore', 'carpetmuncher', 'chocolaterosebuds', 'cialis', 'circlejerk', 'clevelandsteamer', 'clit', 'clitoris', 'cloverclamps', 'clusterfuck', 'cock', 'cocks', 'coon', 'coons', 'coprolagnia', 'coprophilia', 'cornhole', 'creampie', 'cum', 'cumming', 'cumshot', 'cumshots', 'cunnilingus', 'cunt', 'darkie', 'daterape', 'deepthroat', 'dendrophilia', 'dick', 'dildo', 'dingleberries', 'dingleberry', 'dirtypillows', 'dirtysanchez', 'doggiestyle', 'doggystyle', 'dogstyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'donkeypunch', 'doubledong', 'doublepenetration', 'dpaction', 'dryhump', 'dvda', 'eatmyass', 'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'eunuch', 'fag', 'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femalesquirting', 'femdom', 'figging', 'fingerbang', 'fingering', 'fisting', 'footfetish', 'footjob', 'frotting', 'fuck', 'fuckbuttons', 'fuckin', 'fucking', 'fucktards', 'fudgepacker', 'futanari', 'gangbang', 'gaysex', 'genitals', 'giantcock', 'girlon', 'girlontop', 'girlscup', 'girlsgonewild', 'goatcx', 'goatse', 'goddamn', 'gokkun', 'goldenshower', 'goodpoop', 'googirl', 'goregasm', 'grope', 'groupsex', 'gspot', 'guro', 'handjob', 'hardcore', 'hentai', 'homoerotic', 'honkey', 'hooker', 'horny', 'hotcarl', 'hotchick', 'howtokill', 'howtomurder', 'hugefat', 'humping', 'incest', 'intercourse', 'jackoff', 'jailbait', 'jellydonut', 'jerkoff', 'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster', 'kinky', 'knobbing', 'leatherrestraint', 'leatherstraightjacket', 'lemonparty', 'livesex', 'lolita', 'lovemaking', 'makemecome', 'malesquirting', 'masturbate', 'masturbating', 'masturbation', 'menageatrois', 'milf', 'missionaryposition', 'mong', 'motherfucker', 'moundofvenus', 'mrhands', 'muffdiver', 'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nigga', 'nigger', 'nignog', 'nimphomania', 'nipple', 'nipples', 'nsfw', 'nsfwimages', 'nude', 'nudity', 'nutten', 'nympho', 'nymphomania', 'octopussy', 'omorashi', 'onecuptwogirls', 'oneguyonejar', 'orgasm', 'orgy', 'paedophile', 'paki', 'panties', 'panty', 'pedobear', 'pedophile', 'pegging', 'penis', 'phonesex', 'pieceofshit', 'pikey', 'pissing', 'pisspig', 'playboy', 'pleasurechest', 'polesmoker', 'ponyplay', 'poof', 'poon', 'poontang', 'poopchute', 'porn', 'porno', 'pornography', 'princealbertpiercing', 'pthc', 'pubes', 'punany', 'pussy', 'queaf', 'queef', 'quim', 'raghead', 'ragingboner', 'rape', 'raping', 'rapist', 'rectum', 'reversecowgirl', 'rimjob', 'rimming', 'rosypalm', 'rosypalmandhersisters', 'rustytrombone', 'sadism', 'santorum', 'scat', 'schlong', 'scissoring', 'semen', 'sex', 'sexcam', 'sexo', 'sexual', 'sexuality', 'sexually', 'sexy', 'shavedbeaver', 'shavedpussy', 'shemale', 'shibari', 'shit', 'shitblimp', 'shitty', 'shota', 'shrimping', 'skeet', 'slanteye', 'slut', 'smut', 'snatch', 'snowballing', 'sodomize', 'sodomy', 'spastic', 'spic', 'splooge', 'sploogemoose', 'spooge', 'spreadlegs', 'spunk', 'strapon', 'strappado', 'stripclub', 'styledoggy', 'suck', 'sucks', 'suicidegirls', 'sultrywomen', 'swastika', 'swinger', 'taintedlove', 'tastemy', 'teabagging', 'threesome', 'throating', 'thumbzilla', 'tiedup', 'tightwhite', 'tit', 'tits', 'titties', 'titty', 'tongueina', 'topless', 'tosser', 'towelhead', 'tranny', 'tribadism', 'tubgirl', 'tushy', 'twat', 'twink', 'twinkie', 'twogirlsonecup', 'undressing', 'upskirt', 'urethraplay', 'urophilia', 'vagina', 'venusmound', 'viagra', 'vibrator', 'violetwand', 'vorarephilia', 'voyeur', 'voyeurweb', 'voyuer', 'vulva', 'wank', 'wetback', 'wetdream', 'whitepower', 'whore', 'worldsex', 'wrappingmen', 'wrinkledstarfish', 'xxx', 'yaoi', 'yellowshowers', 'yiffy', 'zoophilia']::text[]
$$;

-- Returns NULL when the slug is acceptable, otherwise a machine-readable reason:
-- 'format' | 'numeric' | 'reserved' | 'profanity'
CREATE OR REPLACE FUNCTION public.fn_slug_rejection(p_slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text := coalesce(p_slug, '');
  flat text;
  segs text[];
  w text;
BEGIN
  -- ASCII only
  IF s ~ '[^\x20-\x7E]' THEN RETURN 'format'; END IF;
  IF length(s) < 3 OR length(s) > 40 THEN RETURN 'format'; END IF;
  IF s !~ '^[a-z0-9]([a-z0-9]|-)*[a-z0-9]$' THEN RETURN 'format'; END IF;
  IF s LIKE '%--%' THEN RETURN 'format'; END IF;
  IF replace(s, '-', '') ~ '^[0-9]+$' THEN RETURN 'numeric'; END IF;

  flat := public.fn_normalize_slug(s);
  SELECT array_agg(public.fn_normalize_slug(x))
    INTO segs
    FROM unnest(string_to_array(s, '-')) AS x;

  IF s = ANY (public.fn_slug_reserved_words()) THEN RETURN 'reserved'; END IF;
  FOREACH w IN ARRAY public.fn_slug_reserved_words() LOOP
    IF public.fn_normalize_slug(w) = flat THEN RETURN 'reserved'; END IF;
  END LOOP;

  FOREACH w IN ARRAY public.fn_slug_blocked_terms() LOOP
    IF position(public.fn_normalize_slug(w) IN flat) > 0 THEN RETURN 'reserved'; END IF;
  END LOOP;

  FOREACH w IN ARRAY ARRAY['fuck','shit','porn','slut','nigg'] LOOP
    IF position(w IN flat) > 0 THEN RETURN 'profanity'; END IF;
  END LOOP;

  FOREACH w IN ARRAY public.fn_slug_profanity() LOOP
    IF length(w) <= 4 THEN
      IF w = ANY (segs) OR flat = w THEN RETURN 'profanity'; END IF;
    ELSE
      IF position(w IN flat) > 0 THEN RETURN 'profanity'; END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

-- Trigger: reject invalid slugs however they arrive. Admins and backend bypass.
CREATE OR REPLACE FUNCTION public.enforce_business_slug_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reason text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.slug IS NOT DISTINCT FROM OLD.slug THEN RETURN NEW; END IF;

  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR session_user = 'service_role'
     OR current_user = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
  THEN
    RETURN NEW;
  END IF;

  _reason := public.fn_slug_rejection(NEW.slug);
  IF _reason IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_slug:%', _reason;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_slug_rules ON public.businesses;
CREATE TRIGGER trg_enforce_business_slug_rules
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_slug_rules();

-- UX helper: 'ok' | 'taken' | 'reserved' | 'profanity' | 'numeric' | 'format'
CREATE OR REPLACE FUNCTION public.fn_slug_status(p_slug text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reason text;
BEGIN
  _reason := public.fn_slug_rejection(lower(coalesce(p_slug, '')));
  IF _reason IS NOT NULL THEN RETURN _reason; END IF;
  IF EXISTS (
    SELECT 1 FROM public.businesses
    WHERE slug = lower(p_slug)
      AND (auth.uid() IS NULL OR user_id <> auth.uid())
  ) THEN
    RETURN 'taken';
  END IF;
  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_slug_status(text) TO anon, authenticated, service_role;