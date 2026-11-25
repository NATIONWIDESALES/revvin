CREATE TABLE public.directory_chain_flag_snapshot_20261125 AS SELECT id, is_chain, chain_reason FROM public.directory_listings;
REVOKE ALL ON public.directory_chain_flag_snapshot_20261125 FROM anon, authenticated;
GRANT ALL ON public.directory_chain_flag_snapshot_20261125 TO service_role;
ALTER TABLE public.directory_chain_flag_snapshot_20261125 ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.directory_chain_brands ADD COLUMN IF NOT EXISTS phrase text;
CREATE UNIQUE INDEX IF NOT EXISTS directory_chain_brands_phrase_idx ON public.directory_chain_brands (phrase);

DELETE FROM public.directory_chain_brands WHERE pattern IN ('discounttire','classiccollision','tesla','tuffy','lucid','tranecommercial','calibercollision','caliberautocare','ntbnationaltire');

UPDATE public.directory_chain_brands b SET phrase = m.phrase FROM (VALUES
 ('1800gotjunk','1 800 got junk'),('minutekey','minute key'),('keyme','keyme'),('firestone','firestone'),('pepboys','pep boys'),
 ('napaautopro','napa autopro'),('aamco','aamco'),('gerbercollision','gerber collision'),('searsappliance','sears appliance'),
 ('searsheating','sears heating'),('searshome','sears home'),('tiresplus','tires plus'),('kaltire','kal tire'),('speedyglass','speedy glass'),
 ('jiffylube','jiffy lube'),('mavis','mavis'),('mrlube','mr lube'),('terminix','terminix'),('rotorooter','roto rooter'),('orkin','orkin'),
 ('midas','midas'),('mrtire','mr tire'),('walmart','walmart'),('take5','take 5'),('twomenandatruck','two men and a truck'),('maaco','maaco'),
 ('valvoline','valvoline'),('fergusonplumbing','ferguson plumbing'),('weedman','weed man'),('meineke','meineke'),('bigotires','big o tires'),
 ('brightview','brightview'),('merrymaids','merry maids'),('mollymaid','molly maid'),('maidpro','maidpro'),('trugreen','trugreen'),
 ('ziebart','ziebart'),('safelite','safelite'),('autoglassnow','auto glass now'),('collegehunks','college hunks'),('aptive','aptive'),
 ('krown','krown'),('monroauto','monro auto'),('bathfitter','bath fitter'),('rebath','re bath'),('rivian','rivian'),('sunoco','sunoco'),
 ('servicemaster','servicemaster'),('stricklandbrothers','strickland brothers'),('carx','carx'),('fishwindow','fish window'),
 ('brakesplus','brakes plus'),('costco','costco'),('precisiontune','precision tune'),('greatcanadianoilchange','great canadian oil change'),
 ('oilchangers','oil changers'),('uniglass','uniglass'),('carstar','carstar'),('certapro','certapro'),('crashchampions','crash champions'),
 ('autovalue','auto value'),('mrrooter','mr rooter'),('mrelectric','mr electric'),('mrhandyman','mr handyman'),('mrappliance','mr appliance'),
 ('chemdry','chem dry'),('freshcoat','fresh coat'),('tailoredcloset','tailored closet'),('floorcoveringsinternational','floor coverings international'),
 ('theservicemaster','servicemaster'),('servpro','servpro'),('stanleysteemer','stanley steemer'),('mosquitojoe','mosquito joe'),
 ('mosquitosquad','mosquito squad'),('mosquitohero','mosquito hero'),('budgetblinds','budget blinds'),('glasskote','glasskote'),
 ('handymanconnection','handyman connection'),('aireserv','aire serv'),('onehourheating','one hour heating'),
 ('benjaminfranklinplumbing','benjamin franklin plumbing'),('mistersparky','mister sparky'),('lebeau','lebeau'),
 ('cleaningauthority','cleaning authority'),('homeinstead','home instead'),('joehudson','joe hudson'),('tirechoice','tire choice'),
 ('wheelworks','wheel works'),('tirerama','tirerama'),('bigbrandtire','big brand tire'),('dabella','dabella')
) AS m(pattern, phrase) WHERE b.pattern = m.pattern AND m.pattern <> 'theservicemaster';
DELETE FROM public.directory_chain_brands WHERE pattern = 'theservicemaster';
INSERT INTO public.directory_chain_brands(pattern, phrase) VALUES ('roto','roto rooter') ON CONFLICT DO NOTHING;
DELETE FROM public.directory_chain_brands WHERE pattern = 'roto';
INSERT INTO public.directory_chain_brands(pattern, phrase) VALUES ('mrlubeplus','mister lube') ON CONFLICT DO NOTHING;
DELETE FROM public.directory_chain_brands WHERE pattern = 'mrlubeplus';
UPDATE public.directory_chain_brands SET phrase = pattern WHERE phrase IS NULL;

CREATE OR REPLACE FUNCTION public.fn_directory_name_words(p text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT regexp_replace(btrim(regexp_replace(lower(coalesce(p,'')), '[^a-z0-9]+', ' ', 'g')), '^the ', '')
$$;

CREATE OR REPLACE FUNCTION public.fn_directory_flag_chains() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE changed int;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  WITH base AS (
    SELECT l.id, regexp_replace(lower(l.name), '[^a-z0-9]', '', 'g') AS k, public.fn_directory_name_words(l.name) AS w,
           public.fn_directory_domain(l.website) AS d,
           (l.status = 'unclaimed' AND l.claimed_business_id IS NULL) AS eligible
      FROM public.directory_listings l
  ), nk AS (SELECT k FROM base WHERE k <> '' GROUP BY k HAVING count(*) >= 5),
  dk AS (SELECT d FROM base WHERE d IS NOT NULL
           AND d NOT IN ('facebook.com','instagram.com','google.com','business.site','sites.google.com','wixsite.com','godaddysites.com',
                         'square.site','squarespace.com','weebly.com','wordpress.com','yelp.com','linktr.ee','homeadvisor.com','angi.com',
                         'houzz.com','nextdoor.com','yellowpages.com','yellowpages.ca','bbb.org','mapquest.com')
         GROUP BY d HAVING count(*) >= 5),
  calc AS (
    SELECT b.id, CASE WHEN NOT b.eligible THEN NULL
      WHEN EXISTS (SELECT 1 FROM public.directory_chain_brands c WHERE c.phrase IS NOT NULL AND (b.w = c.phrase OR b.w LIKE c.phrase || ' %')) THEN 'brand'
      WHEN b.k IN (SELECT k FROM nk) THEN 'name_repeat'
      WHEN b.d IN (SELECT d FROM dk) THEN 'domain_repeat' END AS reason
      FROM base b
  )
  UPDATE public.directory_listings l SET is_chain = (c.reason IS NOT NULL), chain_reason = c.reason
    FROM calc c WHERE c.id = l.id AND (l.is_chain IS DISTINCT FROM (c.reason IS NOT NULL) OR l.chain_reason IS DISTINCT FROM c.reason);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN jsonb_build_object('changed', changed);
END $$;
REVOKE ALL ON FUNCTION public.fn_directory_flag_chains() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_flag_chains() TO service_role;

SELECT public.fn_directory_flag_chains();