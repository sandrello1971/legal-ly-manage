-- Assegna il ruolo admin all'utente sandrello@noscite.it se non ce l'ha già
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'admin'::app_role
FROM auth.users au
WHERE au.email = 'sandrello@noscite.it'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = au.id AND ur.role = 'admin'
  );

-- Assegna il ruolo 'user' a tutti gli utenti che non hanno ancora un ruolo
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'user'::app_role
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = au.id
);

-- Aggiorna la funzione per gestire automaticamente i nuovi utenti
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assegna automaticamente il ruolo 'user' ai nuovi utenti
  -- Tranne per sandrello@noscite.it che diventa admin
  IF NEW.email = 'sandrello@noscite.it' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crea il trigger se non esiste già
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW 
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;