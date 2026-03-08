CREATE UNIQUE INDEX unique_confirmed_booking 
ON public.bookings (trainee_id, class_slot_id) 
WHERE status = 'confirmed';