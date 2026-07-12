UPDATE public.public_schools SET school_level = 'elementary' WHERE school_level IN ('ELEMENTARY','PREKINDERGARTEN');
UPDATE public.public_schools SET school_level = 'middle' WHERE school_level = 'MIDDLE';
UPDATE public.public_schools SET school_level = 'high' WHERE school_level IN ('HIGH','SECONDARY');
UPDATE public.public_schools SET school_level = NULL WHERE school_level IN ('OTHER','NOT REPORTED','NOT APPLICABLE','UNGRADED','');