-- Fix existing expenses that were incorrectly marked as rejected
-- They should be pending (NULL) instead

UPDATE public.project_expenses 
SET is_approved = NULL, 
    updated_at = NOW()
WHERE id IN ('6b38480e-d3c5-43b0-8790-db9708dfddf5', 'f155663f-55c5-4029-93f1-34b6a8ab146d')
  AND is_approved = FALSE;