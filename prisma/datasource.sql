---insert default status----
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(1, 'c8c0558c-b141-4351-ae3e-a3adccf7627c', 'Active', 'ACT');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(2, '80125fcc-92cb-46e2-b509-4312bbeea8d4', 'Deleted', 'DLT');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(3, 'e0e78201-da43-40e1-960d-7aea421bd473', 'Completed', 'CMP');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(4, '1c2c0990-1652-413a-a574-b0c0df184bac', 'In Progress', 'INP');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(5, '75a2e68c-d3d1-4d0f-90ab-222a5042c0d1', 'Old', 'OLD');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(6, '6fc53137-308f-4c58-b6d7-9b9509cfa846', 'Rejected', 'RJT');
INSERT INTO public."Status"
(id, "uuid", designation, code)
VALUES(7, '3641f095-70ae-4865-b16c-e6650852cfa1', 'Validated', 'VLD');

---insert default user----
INSERT INTO public."User"
(id, "uuid", "firstName", "lastName", "isAdmin", email, phone, "password", "statusId", "createdAt", "updatedAt")
VALUES(1, 'fa3784d6-8f72-4ab1-a476-0d954bf7c3ea', 'FITAHIANTSOA', 'Ny Aina Fitiavana', true, 'admin@gmail.com', '+261342034890', '1234', 1, '2024-05-24 00:00:00.000', '2024-05-24 00:00:00.000');

ALTER SEQUENCE public."User_id_seq"
	RESTART 2;

