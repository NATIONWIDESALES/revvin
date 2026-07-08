DELETE FROM public.user_roles WHERE user_id IN (SELECT user_id FROM public.profiles WHERE full_name LIKE 'Smoke Tester %');
DELETE FROM public.businesses WHERE name LIKE 'Smoke Biz %';
DELETE FROM public.profiles WHERE full_name LIKE 'Smoke Tester %';