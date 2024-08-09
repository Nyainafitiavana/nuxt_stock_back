---insert default status----
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(1, 'c8c0558c-b141-4351-ae3e-a3adccf7627c', 'Active', 'ACT');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(2, '80125fcc-92cb-46e2-b509-4312bbeea8d4', 'Deleted', 'DLT');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(3, 'e0e78201-da43-40e1-960d-7aea421bd473', 'Completed', 'CMP')
(id, "uuid", designation, code)
VALUES(4, '1c2c0990-1652-413a-a574-b0c0df184bac', 'Completed', 'OSD');

---insert default user----
INSERT INTO public."User"
(id, "uuid", "firstName", "lastName", "isAdmin", email, phone, "password", "statusId", "createdAt", "updatedAt")
VALUES(1, 'fa3784d6-8f72-4ab1-a476-0d954bf7c3ea', 'FITAHIANTSOA', 'Ny Aina Fitiavana', true, 'admin@gmail.com', '+261342034890', '1234', 1, '2024-05-24 00:00:00.000', '2024-05-24 00:00:00.000');

ALTER SEQUENCE public."User_id_seq"
	RESTART 2;

