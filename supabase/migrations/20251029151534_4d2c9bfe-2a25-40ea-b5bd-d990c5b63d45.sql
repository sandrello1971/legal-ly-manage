-- Update the handle_new_user function to include lsala@noscite.it as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Crea il profilo utente
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );

  -- Assegna automaticamente il ruolo admin agli amministratori
  IF NEW.email IN ('sandrello@noscite.it', 'lsala@noscite.it') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Assegna il ruolo 'user' agli altri utenti
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Se l'utente lsala@noscite.it esiste già, assegna il ruolo admin
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Trova l'ID utente dall'email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'lsala@noscite.it';
  
  -- Se l'utente esiste, assegna il ruolo admin
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Ruolo admin assegnato a lsala@noscite.it';
  ELSE
    RAISE NOTICE 'Utente lsala@noscite.it non trovato. Si registrerà automaticamente come admin alla prima registrazione.';
  END IF;
END $$;