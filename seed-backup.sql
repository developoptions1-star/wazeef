-- وَظِيف Database Backup
-- 2026-10-14T07:37:12.555Z

PRAGMA foreign_keys=OFF;

CREATE TABLE admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, job_id INTEGER, worker_id INTEGER,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (1, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:47:56', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (2, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:48:20', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (3, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:48:45', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (4, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:48:48', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (5, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B1-C2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:48:53', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (6, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى A2-C2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:48:56', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (7, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى A1-C2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:48:58', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (8, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:07', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (9, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:16', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (10, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:18', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (11, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:19', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (12, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:21', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (13, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:23', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (14, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:50', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (15, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:50:54', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (16, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:52:31', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (17, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:53:16', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (18, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 03:53:21', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (19, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 09:36:36', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (20, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 09:36:44', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (21, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 09:36:48', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (22, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 09:45:52', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (23, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 11:42:48', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (24, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 11:42:54', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (25, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 14:35:20', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (26, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 14:35:27', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (27, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 19:50:29', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (28, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-09 21:07:29', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (29, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-10 10:53:52', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (30, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-10 10:53:54', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (31, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-10 18:03:07', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (32, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية - مستوى B2. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-11 00:56:07', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (33, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-11 01:06:26', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (34, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الإسبانية. برجاء التعاقد مع شركة توفر هذا التخصص.', 'accepted', '2026-10-11 01:47:07', NULL, NULL);
INSERT INTO "admin_notifications" ("id", "company_id", "type", "message", "status", "created_at", "job_id", "worker_id") VALUES (35, 0, 'missing_language', 'لا توجد شركة توفر وظيفة باللغة: الروسية - مستوى B2-C1. برجاء التعاقد مع شركة توفر هذا التخصص.', 'pending', '2026-10-14 06:19:47', NULL, NULL);

CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    created_by INTEGER,
    is_active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'agent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, qualty_languages TEXT, payment_method TEXT DEFAULT '', payment_operator TEXT DEFAULT '', agent_type TEXT DEFAULT 'normal', team_leader_id INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (1, 'محمد سامي', 'mohamedfaron297@gmail.com', '$2b$10$q/92zVSGjEeXWbqmhHEYu..lD1S1LOMBJ2TvgeoIux6Yc8RYkdJNe', '01227155959', 'SSS-NUHZXTHM', 1, 1, 'super_qualty', '2026-09-27 00:02:52', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (2, 'Saif eldeen taha', 'saif2004taha@gmail.com', '$2b$10$ObBnnkBjLxlN6UM72vPEbO67XC8JMX4CchRcwAJJjeC69vPX74koa', '01034692724', 'SSS-UXPMELGL', 2, 1, 'agent', '2026-09-28 07:21:00', NULL, 'wallet', 'vodafone', 'normal', 8);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (3, 'Mohamed Gamal AbdelMaboud', 'mohamed.g.kutb@gmail.com', '$2b$10$zlBxcg3Gof7gENhrAScDf.80aWjnsgk2HG3tKKdVwCb4fN8en1qfe', '01028920847', 'SSS-NTUD5U86', 2, 1, 'agent', '2026-09-28 07:22:11', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (5, 'Samaa Abdelfattah Mohamed', 'alnmralshard84@gmail.com', '$2b$10$Yeq66RwqpfQxbBMDoeXgRu1f1dpvUNtKrE6wdesYBKkfJHs/bNPCC', '‏‪01205613748', 'SSS-56AABUYY', 2, 1, 'agent', '2026-09-28 07:23:33', NULL, 'wallet', 'orange', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (6, 'Manar Saeed Hashem', 'manarsayed425@gmail.com', '$2b$10$SY.v.4f1R1heK1mbC1hjN.V43g9SFUiKssmqtnkf.xZZEFyQoQErS', '01017249818', 'SSS-3PF4EX7Z', 2, 1, 'agent', '2026-09-28 07:24:12', NULL, 'wallet', 'vodafone', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (7, 'Nourhan Ahmed Saad', 'nourhanahmed1325@gmail.com', '$2b$10$3Or7BRmXLqzrg5M0GHDqRe.BrLkXSFrJIeJlVke6ctJh4zleOWThO', '‏‪01068769786‬‏', 'SSS-VKDJ8QL9', 2, 1, 'agent', '2026-09-29 19:09:33', NULL, 'wallet', 'vodafone', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (8, 'Tamer osama kamal', 'tamerosama349@gmail.com', '$2b$10$xS3Mzk9KgAM5mwitP4yLpebfC1cmT.un7ZlR32wWTO05o8t89sfyS', '01155395628', 'SSS-NDM4KPSW', 1, 1, 'team_leader', '2026-09-29 20:04:09', NULL, 'wallet', 'etisalat', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (9, 'EI_AD', 'eiadtamer01@gmail.com', '$2b$10$XSIKKY1Yakk4AaiJKvXdZOXZXfRcsrLMHCZ/BqafLW144B0Au1.76', '01069731664', 'SSS-AKNQKJJO', 2, 1, 'agent', '2026-10-03 13:11:57', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (10, 'Mohamed Shaaban', 'ms895893@gmail.com', '$2b$10$0n7gLtAaRZ5ZLk3SBNxbXOy.rVFXWWwDEl5.ZtiB02jUtYf80jlf6', '01157553597', 'SSS-F5PEX7I0', 1, 1, 'team_leader', '2026-10-03 17:47:07', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (11, 'Esraa atef', 'esraahanyaa@gmail.com', '$2b$10$XLD1c0DWNpfx253ui5eOW.3ZxJ/5vDb8O/sBeQBLlfQyEXVJhi5ga', '01260010738', 'SSS-CU6B56KJ', 1, 1, 'agent', '2026-10-03 18:14:57', NULL, 'wallet', 'orange', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (12, 'Rodina Ahmed', 'Rodinaahmad888@gmail.com', '$2b$10$r3F.vAmvy0Z/owaAC3iPl.xco3Bp.OXO8Qt1SY11ZIqTtc5tj4yU2', '01010657940', 'SSS-U3OG7A8X', 1, 1, 'agent', '2026-10-04 16:51:14', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (13, 'M7medpregame', 'M7medpregame@gmail.com', '$2b$10$Mh6nG7jn3IDSrDslDlnqJO7t3XdEngT7c2ZC14UKhr9CVAEUixXJC', '+20 11 41967164', 'SSS-IYQ0ZM10', 1, 1, 'super_qualty', '2026-10-05 19:30:51', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (14, 'Youssef mohamed', 'youssafmohamed202@outlook.com', '$2b$10$EPJE0uezCICC.G3ct1lMJ.jKJedF2FzX1vZxoo91EkSprFb6I8Ln2', '01067974695', 'SSS-TKUENI26', 2, 1, 'team_leader', '2026-10-06 02:46:40', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (16, 'محمد ياسر منصور', 'Mohamedyassereman1@gmail.com', '$2b$10$okCHjgRb9I6qAvxZGp3uVuZX3LgqBvE3KVFxCVEt4DajQD86hsGTG', '01126252103', 'SSS-F2MU2JQJ', 1, 1, 'agent', '2026-10-06 19:58:08', NULL, 'wallet', 'etisalat', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (18, 'هاجر عاطف ', 'atefhager905@gmail.com', '$2b$10$8KOPEvV0zLli6hTC574qvuphBgDw1glZD/obZHj3YlCJVczUQj0Y6', '01068769786', 'SSS-XSDDOVHA', 1, 1, 'agent', '2026-10-06 21:45:32', NULL, 'wallet', 'vodafone', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (19, 'هادى هشام محمد', 'h7732000@gmail.com', '$2b$10$v79MnwEStJxUDm0VQWlLP.VIQi3LOAjLsztk88GZvHD5oUO2EpDHW', '01147847786', 'SSS-R17SHTL7', 1, 1, 'agent', '2026-10-07 01:52:10', NULL, 'instapay', '', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (20, 'يوسف سامي محمود', 'samyyoussef277@gmail.com', '$2b$10$4vgL8mAY1SzI4jsVlrI3puuj8jkZhvx8S8e1FPoEK2EqNWoeRzTTC', '01080282778', 'SSS-1FNGIYNM', 1, 1, 'agent', '2026-10-07 04:54:45', NULL, 'wallet', 'vodafone', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (21, 'Fatma Mohamed', 'totaelpopotota@gmail.com', '$2b$10$asjEfZc59rw/nJmz4./.JutLGgZun8IEikgdWycTVJ5K3Jm6LpXFG', '01011635612', 'SSS-BZZKZ3SY', 2, 1, 'agent', '2026-10-10 14:45:56', NULL, 'instapay', '', 'normal', 14);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (22, 'Waleed Osama', 'Osamawaleed243@gmail.com', '$2b$10$Nyng2YiqHjUo.Dur9ysfbuvsUCVx2t4y8Y/O4K2UIQDHoLy91c7u.', '01032497921', 'SSS-O7X5F7OJ', 1, 1, 'agent', '2026-10-10 18:46:17', NULL, 'wallet', 'vodafone', 'normal', 8);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (23, 'Ahmed Mahmoud El-Mahalawy', 'a01122902434@gmail.com', '$2b$10$xoOAFdtumnVOaxz5Nkmule9ztTt3X51BMisreu6qOPTOfgXRifQWS', '01003644464', 'SSS-5AC6AIE8', 1, 1, 'agent', '2026-10-10 19:04:56', NULL, 'instapay', '', 'normal', NULL);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (24, 'محمد خالد منصور', 'Hookmohamed30@gmail.com', '$2b$10$x5QOLl1DCvU6d8w9OYy/z.JDPVVoZNREfGjHS9vBqHD2xfMKbv9sW', '01153961395', 'SSS-D4SYIY2E', 1, 1, 'agent', '2026-10-10 23:10:19', NULL, 'wallet', 'etisalat', 'normal', 10);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (25, 'اسلام سيد ', 'Islamsayed543@gmail.com', '$2b$10$uGfr6K/0t.o3KIGnL5/wXOrdZDdNrLd98dcclwVNq0SA0XTDl7z/e', '٠١١٥٤٣١٣٠٣٣', 'SSS-ET5RN5LI', 4, 1, 'agent', '2026-10-11 01:56:30', NULL, 'instapay', '', 'normal', 10);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (26, ' Elsayed Redha Madi', 'Sr8283625@gmail.com', '$2b$10$CxSM1pgVNhqvdMVC.5LKYuc6xoaoqv2tRaYsHkxNCotkxaR7VjhES', '01120084792', 'SSS-KL7II2DT', 2, 1, 'agent', '2026-10-11 09:48:25', NULL, 'wallet', 'etisalat', 'normal', 10);
INSERT INTO "agents" ("id", "name", "email", "password", "phone", "referral_code", "created_by", "is_active", "role", "created_at", "qualty_languages", "payment_method", "payment_operator", "agent_type", "team_leader_id") VALUES (27, ' يوسف محمد ابو اليسر  ', 'Youseef.mohamed4245@gmail.com', '$2b$10$vGULbBNZIiYT/CO0XAx5OuQTkxiZR2rwpGBqzkLrxeD/P7vUanLaG', '01148284971', 'SSS-CVRZMJ3M', 1, 1, 'agent', '2026-10-11 15:47:58', NULL, 'instapay', '', 'normal', 10);

CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    audio_file TEXT,
    audio_url TEXT DEFAULT '',
    language TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, rerecord_request INTEGER DEFAULT 0, rejection_date DATETIME, rejection_reason TEXT, approval_date DATETIME, assigned_qualty_id INTEGER, reviewed_by INTEGER, reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (1, 5, NULL, '', 'en', 'approved', '2026-10-03 22:53:58', 0, NULL, NULL, '2026-10-09 03:55:00', 8, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (3, 9, NULL, '', 'en', 'rejected', '2026-10-05 19:29:45', 0, '2026-10-05 20:38:41', 'مستوي اللغه A2 و هو غير كاف و هناك نقاط يجب العمل عليها لتطوير ذاتك كالنطق و الفصاحه في الحديث لتبين التحدث بشكل طليق و سليم كما هو مطلوب و ايضا عليك بالعمل علي القواعد كثيرا و تنسيقها مع الافكار. ', NULL, 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (4, 15, NULL, '', 'en', 'rejected', '2026-10-06 16:48:48', 0, '2026-10-06 18:18:49', 'بعد التقييم، مستوى اللغة الإنجليزية لديك حاليًا A2، وهو أقل من المستوى المطلوب للوظيفة.

ننصحك بالتركيز على تطوير الـ Speaking والـ Vocabulary والاستماع والممارسة اليومية، ومع الاستمرار هتقدر توصل لمستوى أفضل وتقدم مرة أخرى على فرص مناسبة لك.

بالتوفيق وإن شاء الله نشوفك قريبًا بمستوى أقوى. ❤️', NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (5, 17, NULL, '', 'ar', 'rejected', '2026-10-07 01:18:04', 0, '2026-10-07 02:42:31', 'للاسف لا يوجد اكونت عربي حاليا برجاء التقديم بعد توفير اكونت عربي ', NULL, 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (6, 19, NULL, '', 'en', 'approved', '2026-10-07 18:25:17', 0, NULL, NULL, '2026-10-07 19:38:06', 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (7, 21, NULL, '', 'de', 'approved', '2026-10-08 12:50:17', 0, NULL, NULL, '2026-10-09 03:45:54', 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (8, 22, NULL, '', 'ru', 'approved', '2026-10-08 18:03:56', 0, NULL, NULL, '2026-10-09 03:47:54', 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (9, 23, NULL, '', 'es', 'approved', '2026-10-08 18:40:56', 0, NULL, NULL, '2026-10-09 03:48:18', 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (10, 29, NULL, '', 'ar', 'rejected', '2026-10-09 12:42:23', 0, '2026-10-09 19:27:14', 'بي رجاء ارسال نص صوتي بي الغه الإنجليزي', NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (11, 32, NULL, '', 'ar', 'rejected', '2026-10-09 15:34:56', 0, '2026-10-09 19:26:54', 'بي رجاء ارسال نص صوتي بي الغه الإنجليزي ', NULL, 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (12, 27, NULL, '', 'ar', 'rejected', '2026-10-09 17:12:24', 0, '2026-10-09 22:59:28', 'للاسف لا يوجد لدينا اكونت عربي متاح حاليا عندما يتم أتاح سيتم إرسال لك رساله ', NULL, 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (13, 35, NULL, '', 'en', 'rejected', '2026-10-09 19:32:12', 0, '2026-10-09 20:19:03', 'Keep practising! You’ll improve. Retest in one month.', NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (14, 39, NULL, '', 'en', 'approved', '2026-10-10 08:26:51', 0, NULL, NULL, '2026-10-10 08:42:03', 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (15, 40, NULL, '', 'en', 'approved', '2026-10-10 08:34:43', 0, NULL, NULL, '2026-10-10 09:13:01', 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (16, 41, NULL, '', 'en', 'approved', '2026-10-10 11:12:12', 0, NULL, NULL, '2026-10-10 11:28:20', 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (17, 42, NULL, '', 'ar', 'rejected', '2026-10-10 11:19:00', 0, '2026-10-10 11:52:12', 'بي رجاء مراجعة رسائل الواتس اب ', NULL, 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (18, 43, NULL, '', 'en', 'rejected', '2026-10-10 16:20:06', 0, '2026-10-10 19:54:52', '', NULL, 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (19, 44, NULL, '', 'en', 'rejected', '2026-10-10 19:40:20', 0, '2026-10-10 19:52:30', '', NULL, 13, 13, '2026-10-10 19:52:30');
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (20, 45, NULL, '', 'en', 'approved', '2026-10-10 22:06:28', 0, NULL, NULL, '2026-10-10 22:09:57', 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (21, 48, NULL, '', 'en', 'approved', '2026-10-10 22:14:41', 0, NULL, NULL, '2026-10-10 22:24:30', 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (22, 46, NULL, '', 'en', 'rejected', '2026-10-10 22:16:57', 0, '2026-10-10 22:29:18', 'شكرًا لتقديمك عبر موقع وظّيف ❤️

نرى أن لديك القدرة على التطور وتحسين مستواك بسرعة، ومن الواضح أنك بذلتِ مجهودًا كبيرًا في التدريب.

شركة وظّيف تدعمك وتتمنى لكِ التوفيق، وندعوكِ للتقديم مرة أخرى بعد تحسين مستواك، فنحن نؤمن بقدرتك على التطور وتحقيق نتائج أفضل. 🌟', NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (24, 57, NULL, '', 'ar', 'rejected', '2026-10-11 01:58:38', 0, '2026-10-11 02:03:54', 'للاسف لا يوجد اكونت عربي حاليا شكرا لي تقديمك في موقعنا 
وظيف♥️', NULL, 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (25, 58, NULL, '', 'en', 'rejected', '2026-10-11 06:33:00', 0, '2026-10-11 08:10:05', 'Keep practising your English! We look forward to reassessing you in one month. Good luck!', NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (26, 62, NULL, '', 'ar', 'rejected', '2026-10-11 09:58:40', 0, '2026-10-11 15:54:01', 'للاسف لا يوجد اكونت عربي حاليا شكرا لي تقديمك في موقعنا وظيف♥️', NULL, 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (27, 61, NULL, 'https://voca.ro/1dCKBJawYWG5', 'en', 'approved', '2026-10-11 10:16:41', 0, NULL, NULL, '2026-10-11 16:48:17', 11, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (28, 64, NULL, '', 'ar', 'rejected', '2026-10-11 18:47:11', 0, '2026-10-11 19:23:37', 'للاسف لا يوجد اكونت عربي حاليا شكرا لي تقديمك في موقعنا وظيف♥️', NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (29, 34, NULL, '', 'ar', 'rejected', '2026-10-11 19:01:30', 0, '2026-10-14 00:09:56', '', NULL, 1, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (30, 66, '1791938538389-recording.webm', '', 'de', 'pending', '2026-10-14 00:42:18', 0, NULL, NULL, NULL, 13, NULL, NULL);
INSERT INTO "applications" ("id", "user_id", "audio_file", "audio_url", "language", "status", "created_at", "rerecord_request", "rejection_date", "rejection_reason", "approval_date", "assigned_qualty_id", "reviewed_by", "reviewed_at") VALUES (31, 68, NULL, '', 'en', 'rejected', '2026-10-14 07:18:14', 0, '2026-10-14 07:27:18', 'Keep practising your English! We look forward to reassessing you in one month. Good luck!', NULL, 1, NULL, NULL);

CREATE TABLE companies (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     position TEXT,
     description TEXT,
     interview_time TEXT,
     interview_schedule TEXT,
     salary_min REAL DEFAULT 0,
     salary_max REAL DEFAULT 0,
     company_email TEXT,
     available_slots INTEGER DEFAULT 0,
     used_slots INTEGER DEFAULT 0,
     pending_count INTEGER DEFAULT 0,
     hired_count INTEGER DEFAULT 0,
      deadline TEXT,
      notify_days_before INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   , education_requirement TEXT DEFAULT 'both', type TEXT DEFAULT 'normal');

INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (1, 'EClerx', 'Customer Support Specialists', '📍 Location: Maadi Technology Park, Cairo

🕒 Rotational Night & 
Overnight Shifts

🎯 Requirements: • Graduates Only
• English Level: B2
•With BPO experience 
▪︎Egyptians wiz Max age 40 

💰 Salary Package (NET): • 15,500 EGP Basic Salary
• 2,300 EGP Night Allowance
• Up to 3,200 EGP KPI Bonus
✅ Total Net Package: 20K–21K Monthly

🎁 Benefits: • Medical Insurance (200K annual coverage)
• Family Medical Insurance Included
• Door-to-Door Transportation 🚍
• Amazing Career Growth Opportunities 📈', 'sunday to thursday 1 PM to 5 PM', '', 20000, 21000, '', 0, 0, 1, 0, '', 5, '2026-10-03 14:44:58', 'graduates', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (2, 'TTEC', 'Spanish Sales Representative', '📍 maadi
📂 Sales
💰 Up to EGP 28,500 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 45
🎓 Education: Graduate
📋 Experience: 💼 Minimum 1 year of Sales experience
💬 Strong communication skills
💻 Computer literacy & ability to handle systems efficiently

Job Responsibilities:
• Handle customer inquiries professionally.
• Provide accurate information and effective solutions.
• Ensure a high level of customer satisfaction.
• Maintain excellent communication with customers.
• Deliver an outstanding customer experience.

Work Conditions:
🕘 Rotational Shifts (9 hours – 24/7)
📅 2 Rotational Days Off

Salary & Benefits:
💰 Total Gross Salary: 28,500 EGP + Commission 
🏥 Medical Insurance
👥 Social Insurance
🚌 Transportation Provided (Collection Points)
🚖 Door-to-door transportation for females from 10:00 PM to 6:00 AM
✅ Ready to start on 7th Oct 
🗣️ Languages: English (B2), Spanish (B2+)

🎁 Benefits:
✅ Medical Insurance
✅ Social Insurance
✅ Paid Training
✅ transportation provided


📅 Work Schedule:
☀️ Rotational Shift
🕐 Shifts: Morning, Night, Overnight
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 8 hours and 1 hr break', 'Monday to Thursday 11 AM to 4 PM', '', 28500, 28500, 'qweqwe@gmail.com', 0, 0, 1, 0, '', 5, '2026-10-03 15:15:02', 'graduates', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (3, 'Vitrin Clinic', 'Sales Representatives', '📍 Heliopolis 
📂 Telesales
💰 Net EGP 17,500 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Foreigners & Egyptians
🎂 Max Age: 30
🎓 Education: Graduate
📋 Experience: Sales experience is a must at least 2 year | 
🎯 Requirements:

Medical Tourism experience is preferred.
Fluent English C1 |
Strong communication & closing skills | 
Graduates only | 
Egypt-based (foreigners in Egypt welcome) | 
Dentists highly preferred

🦷 Role: 
Contact patients & offer dental services
 (e.g., Hollywood Smile & treatments) as part of the clinic team

📚 Training: 15 days (paid upon passing)

💰Salary 
17,500 EGP + Commission → 
After 3 months: 20,000 EGP Net + 5,000 KPIs + Commission

✔️Interview process will be Onsite)
 (once pass the first one will have a second one with the operation team ) 
🗣️ Languages: English (C1)

📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night, Overnight
📆 Working Days: Sun–Thu + 1st Saturday monthly
⏰ Hours: 10 PM – 7 AM (1-hour break)', 'Voice Validation First', '', 17500, 23000, '', 0, 0, 0, 0, '', 5, '2026-10-03 15:31:54', 'graduates', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'Double check first', '', 10000, 20000, '', 0, 0, 1, 0, '', 5, '2026-10-03 15:37:01', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (5, 'LTS', 'Outbound Call Agent (USA Campaign)', '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'Monday to Friday 4 Pm till 8 Pm', '', 12000, 14000, '', 0, 0, 2, 0, '', 5, '2026-10-03 16:01:18', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (6, 'Leadbull', 'Canadian Telesales Account', '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', '', 15000, 20000, '', 0, 0, 0, 0, '', 5, '2026-10-03 16:47:57', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (7, 'Winirix', 'Appointment Setter / Live Transfers', 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', 'Online interview', '', 12000, 14000, '', 0, 0, 0, 0, '', 5, '2026-10-03 16:50:46', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (8, 'GeekyCX', 'Customer Service Representative – Bilingual Track (English & Spanish)', 'Customer Service Representative – Bilingual Track (English & Spanish)

🎯 Requirements:
• C1 English proficiency
• C1 Spanish proficiency
• Clear & professional phone communication
• Strong listening skills
• Basic computer & CRM skills
• Customer service experience is a MUST
• Fresh graduates are welcome

💼 Responsibilities (Brief):
• Handle inbound & outbound calls with US clients
• Provide updates on debt relief accounts
• Address client concerns & escalate complex issues
• Maintain accurate CRM records
• Meet daily call & quality targets

Working Hours:
Night Shift (7 PM – 4 AM)

💰 Salary Package:
• Gross Salary: 35,000 EGP
• Paid Training
• Performance Bonuses

📍Location: On-site – Sheikh Zayed, Cairo', 'Tuesday 7PM till 10PM - Wednesday 7PM till 10PM - Friday 7PM till 10PM', '', 35000, 35000, '', 0, 0, 0, 0, '', 5, '2026-10-03 16:53:45', 'graduates', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (9, 'TTC (US)', 'Telesales Agents (US Account)', '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'Monday to Friday 3 Pm till 5 Pm', '', 15000, 15000, '', 0, 0, 2, 0, '2026-11-09', 5, '2026-10-03 17:10:54', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (10, 'Cxperts', 'Medical Account', 'Requirements:
C1 English level
1-2 years of outbound sales/ lead generation experience ( medical, healthcare, or staffing industry preferred)

Salary:
Basic 15k
KPI''S 5
Transportation allowance 
Commision (50-100 USD) per hired doctor 

Account nature:
Staffing agents contact physicans in America and offer them temporary positions in clinics. 

Shifts: Rotational and overnight between 4 PM to 4 AM

Location: Elboustan mall 9th floor Tahrir-down town', 'Monday to Friday 1PM till 7PM', '', 15000, 20000, '', 0, 0, 0, 0, '', 5, '2026-10-03 17:18:00', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (11, 'SJL', 'Telesales Agent (MEDICAL)', 'Telesales Agent (MEDICAL)', 'Monday 7:00 PM to 11:00PM - Tuesday 7:00 PM to 11:00PM - Wednesday 7:00 PM to 11:00PM - Friday 7:00 PM to 11:00PM', '', 10000, 150000, 'Telesales Agent (MEDICAL)', 0, 0, 0, 0, '', 5, '2026-10-03 17:24:10', 'both', 'normal');
INSERT INTO "companies" ("id", "name", "position", "description", "interview_time", "interview_schedule", "salary_min", "salary_max", "company_email", "available_slots", "used_slots", "pending_count", "hired_count", "deadline", "notify_days_before", "created_at", "education_requirement", "type") VALUES (12, 'BIS', 'MLA Telesales Representative | US Campaign', 'We are currently hiring MLA Telesales Representatives for our US Campaign.

Requirements:

✅ C1 English level (Required)
✅ Arabic speaker (Required)
✅ Previous telesales experience is a plus
✅ Minimum age: 20 years

Work Schedule:

📆 Monday to Friday
🕒 3:00 PM – 11:00 PM (Fixed Shift)
📅 Weekends Off (Saturday & Sunday)

Compensation & Benefits:

💰 Basic Salary: 12,000 EGP
(based on English level and interview performance) 
💸 Attractive Commissions
🎓 Paid probation and a bonus after passing
📍 Location: Makram Ebeid, Nasr City
🚫 No Transportation Provided
🚫 No Work From Home
🚫 No Part-Time Opportunities', 'Monday to Friday 4:30PM till 8:30PM', '', 12000, 15000, '', 0, 0, 1, 0, '', 5, '2026-10-03 17:27:36', 'both', 'normal');

CREATE TABLE company_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    needed_count INTEGER DEFAULT 1,
    filled_count INTEGER DEFAULT 0,
    position TEXT DEFAULT '',
    salary_min REAL DEFAULT 0,
    salary_max REAL DEFAULT 0,
    interview_time TEXT DEFAULT '',
    deadline TEXT DEFAULT '',
    notify_days INTEGER DEFAULT 5,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (1, 1, 'الإنجليزية', 'B2', 10, 0, 'Customer Support Specialists', 20000, 21000, 'sunday to thursday 1 PM to 5 PM', '2026-10-31', 10, '📍 Location: Maadi Technology Park, Cairo

🕒 Rotational Night & 
Overnight Shifts

🎯 Requirements: • Graduates Only
• English Level: B2
•With BPO experience 
▪︎Egyptians wiz Max age 40 

💰 Salary Package (NET): • 15,500 EGP Basic Salary
• 2,300 EGP Night Allowance
• Up to 3,200 EGP KPI Bonus
✅ Total Net Package: 20K–21K Monthly

🎁 Benefits: • Medical Insurance (200K annual coverage)
• Family Medical Insurance Included
• Door-to-Door Transportation 🚍
• Amazing Career Growth Opportunities 📈', '2026-10-03 14:44:58');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (2, 2, 'الإسبانية', 'B2', 10, 0, 'Spanish Sales Representative', 28500, 28500, 'Monday to Thursday 11 AM to 4 PM', '2026-10-31', 5, '📍 maadi
📂 Sales
💰 Up to EGP 28,500 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 45
🎓 Education: Graduate
📋 Experience: 💼 Minimum 1 year of Sales experience
💬 Strong communication skills
💻 Computer literacy & ability to handle systems efficiently

Job Responsibilities:
• Handle customer inquiries professionally.
• Provide accurate information and effective solutions.
• Ensure a high level of customer satisfaction.
• Maintain excellent communication with customers.
• Deliver an outstanding customer experience.

Work Conditions:
🕘 Rotational Shifts (9 hours – 24/7)
📅 2 Rotational Days Off

Salary & Benefits:
💰 Total Gross Salary: 28,500 EGP + Commission 
🏥 Medical Insurance
👥 Social Insurance
🚌 Transportation Provided (Collection Points)
🚖 Door-to-door transportation for females from 10:00 PM to 6:00 AM
✅ Ready to start on 7th Oct 
🗣️ Languages: English (B2), Spanish (B2+)

🎁 Benefits:
✅ Medical Insurance
✅ Social Insurance
✅ Paid Training
✅ transportation provided


📅 Work Schedule:
☀️ Rotational Shift
🕐 Shifts: Morning, Night, Overnight
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 8 hours and 1 hr break', '2026-10-03 15:15:02');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (3, 2, 'الإنجليزية', 'C1', 10, 0, 'English Costumer Service Representative', 24480, 24480, 'Monday to Friday 11 am to 4pm', '2026-10-31', 5, '📍 Company: TTEC
📍 Location: Maadi Technology Park
📅 Joining Date: • 24 Aug 2026
✅ Requirements: • C1 English Level.
• Graduates Only.
• Minimum 1 year of Customer Service experience.
• Egyptian Nationals.
💰 Gross Salary: EGP 24,480
🎁 Benefits: ▪️ Medical Insurance.
▪️ Social Insurance.
▪️ Transportation Provided.
▪️ Paid Training.
▪️ Career Growth Opportunities.
▪️ Rotational Shifts.', '2026-10-03 15:15:02');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (4, 3, 'الإنجليزية', 'C1', 10, 0, 'Sales Representatives', 17500, 23000, 'Voice Validation First', '2026-10-31', 5, '📍 Heliopolis 
📂 Telesales
💰 Net EGP 17,500 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Foreigners & Egyptians
🎂 Max Age: 30
🎓 Education: Graduate
📋 Experience: Sales experience is a must at least 2 year | 
🎯 Requirements:

Medical Tourism experience is preferred.
Fluent English C1 |
Strong communication & closing skills | 
Graduates only | 
Egypt-based (foreigners in Egypt welcome) | 
Dentists highly preferred

🦷 Role: 
Contact patients & offer dental services
 (e.g., Hollywood Smile & treatments) as part of the clinic team

📚 Training: 15 days (paid upon passing)

💰Salary 
17,500 EGP + Commission → 
After 3 months: 20,000 EGP Net + 5,000 KPIs + Commission

✔️Interview process will be Onsite)
 (once pass the first one will have a second one with the operation team ) 
🗣️ Languages: English (C1)

📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night, Overnight
📆 Working Days: Sun–Thu + 1st Saturday monthly
⏰ Hours: 10 PM – 7 AM (1-hour break)', '2026-10-03 15:31:55');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (5, 4, 'الإنجليزية', 'B2', 10, 0, 'PAS Patient Assistance Survey at Evolve Marketing LLC', 10000, 20000, 'Double check first', '2026-10-31', 5, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', '2026-10-03 15:38:57');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (6, 2, 'الفرنسية', 'B2', 10, 0, 'French Sales Repetitive', 33500, 33500, 'Monday to Friday 11 am to 4pm', '2026-10-31', 5, '📍 maadi
📂 Sales
💰 Up to EGP 33,500 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 45
🎓 Education: Graduate
📋 Experience: 💼 Minimum 1 year of Sales experience
💬 Strong communication skills
💻 Computer literacy & ability to handle systems efficiently

Job Responsibilities:
• Handle customer inquiries professionally.
• Provide accurate information and effective solutions.
• Ensure a high level of customer satisfaction.
• Maintain excellent communication with customers.
• Deliver an outstanding customer experience.

Work Conditions:
🕘 Rotational Shifts (9 hours – 24/7)
📅 2 Rotational Days Off

Salary & Benefits:
💰 Total Gross Salary: 33,500 EGP + Commission 
🏥 Medical Insurance
👥 Social Insurance
🚌 Transportation Provided (Collection Points)
🚖 Door-to-door transportation for females from 10:00 PM to 6:00 AM
✅ Ready to start on 7th Oct 
🗣️ Languages: English (B2), French (B2+)

🎁 Benefits:
✅ Medical Insurance
✅ Social Insurance
✅ Paid Training
✅ transportation provided


📅 Work Schedule:
☀️ Rotational Shift
🕐 Shifts: Morning, Night, Overnight
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 8 hours and 1 hr break', '2026-10-03 15:45:41');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (7, 2, 'الهولندية', 'B2', 10, 0, 'Dutch Sales Representative', 64000, 64000, 'Monday to Friday 11 am to 4pm', '2026-10-31', 5, '📍 maadi
📂 Sales
💰 Up to EGP 64,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 45
🎓 Education: Graduate
📋 Experience: 💼 Minimum 1 year of Sales experience
💬 Strong communication skills
💻 Computer literacy & ability to handle systems efficiently

Job Responsibilities:
• Handle customer inquiries professionally.
• Provide accurate information and effective solutions.
• Ensure a high level of customer satisfaction.
• Maintain excellent communication with customers.
• Deliver an outstanding customer experience.

Work Conditions:
🕘 Rotational Shifts (9 hours – 24/7)
📅 2 Rotational Days Off

Salary & Benefits:
💰 Total Gross Salary: 64,000 EGP + Commission 
🏥 Medical Insurance
👥 Social Insurance
🚌 Transportation Provided (Collection Points)
🚖 Door-to-door transportation for females from 10:00 PM to 6:00 AM
✅ Ready to start on 7th Oct 
🗣️ Languages: English (B2), Dutch (B2+)

🎁 Benefits:
✅ Medical Insurance
✅ Social Insurance
✅ Paid Training
✅ transportation provided


📅 Work Schedule:
☀️ Rotational Shift
🕐 Shifts: Morning, Night, Overnight
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 8 hours and 1 hr break', '2026-10-03 15:45:41');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (8, 5, 'الإنجليزية', 'B2', 10, 0, 'Outbound Call Agent (USA Campaign)', 12000, 14000, 'Monday to Friday 4 Pm till 8 Pm', '2026-10-31', 5, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', '2026-10-03 16:01:29');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (9, 6, 'الإنجليزية', 'B2', 10, 0, 'Canadian Telesales Account', 15000, 20000, 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', '2026-10-31', 5, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', '2026-10-03 16:47:57');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (10, 7, 'الإنجليزية', 'B2', 10, 0, 'Appointment Setter / Live Transfers', 12000, 14000, 'Online interview', '2026-10-31', 5, 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', '2026-10-03 16:50:46');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (11, 8, 'الإسبانية', 'C1', 10, 0, 'Customer Service Representative – Bilingual Track (English & Spanish)', 35000, 35000, 'Tuesday 7PM till 10PM - Wednesday 7PM till 10PM - Friday 7PM till 10PM', '2026-10-31', 5, 'Customer Service Representative – Bilingual Track (English & Spanish)

🎯 Requirements:
• C1 English proficiency
• C1 Spanish proficiency
• Clear & professional phone communication
• Strong listening skills
• Basic computer & CRM skills
• Customer service experience is a MUST
• Fresh graduates are welcome

💼 Responsibilities (Brief):
• Handle inbound & outbound calls with US clients
• Provide updates on debt relief accounts
• Address client concerns & escalate complex issues
• Maintain accurate CRM records
• Meet daily call & quality targets

Working Hours:
Night Shift (7 PM – 4 AM)

💰 Salary Package:
• Gross Salary: 35,000 EGP
• Paid Training
• Performance Bonuses

📍Location: On-site – Sheikh Zayed, Cairo', '2026-10-03 16:53:45');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (12, 8, 'الإنجليزية', 'B2', 10, 0, 'Customer Service Representative – English Track', 20000, 20000, 'Tuesday 7PM till 10PM - Wednesday 7PM till 10PM - Friday 7PM till 10PM', '2026-10-31', 5, 'Customer Service Representative – English Track

🎯 Requirements:
• C1 / B2+ English proficiency
• Clear & professional phone communication
• Strong listening skills
• Basic computer & CRM skills
• Customer service experience is a MUST
• Fresh graduates are welcome 

💼 Responsibilities (Brief):
• Handle inbound & outbound calls with US clients
• Provide updates on debt relief accounts
• Address client concerns & escalate complex issues
• Maintain accurate CRM records
• Meet daily call & quality targets

Working Hours: 
Night Shift (7 PM – 4 AM)

💰 Salary Package:
• Net Salary: 18,000 EGP
$100 KPIs + 2K Transportation
• Paid Training
• Performance Bonuses

📍Location: On-site – Sheikh Zayed, Cairo', '2026-10-03 17:00:36');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (13, 8, 'الإنجليزية', 'C1', 10, 0, 'Sales Representative', 15000, 20000, '🕐 Tuesday 7PM till 10PM - Wednesday 7PM till 10PM - Friday 7PM till 10PM', '', 5, '🎯 Requirements:
• English level B2+
• Sales Experience 

🕒 Working Hours: 
7 PM – 4 AM 

📅 Days Off: 
Saturday & Sunday

💰 Compensation Package:
• Net Salary: 15,000 EGP
• Uncapped Bonuses (Potential up to $2,000 USD/month)
• Transportation Allowance: Up to 2,000 EGP/month

📍 Location: On-site – Sheikh Zayed', '2026-10-03 17:05:11');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (14, 9, 'الإنجليزية', 'B2', 10, 0, 'Telesales Agents (US Account)', 15000, 15000, 'Monday to Friday 3 Pm till 5 Pm', '2026-11-09', 5, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', '2026-10-03 17:10:54');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (15, 10, 'الإنجليزية', 'C1', 10, 0, 'Medical Account', 15000, 20000, 'Monday to Friday 1PM till 7PM', '2026-10-31', 5, 'Requirements:
C1 English level
1-2 years of outbound sales/ lead generation experience ( medical, healthcare, or staffing industry preferred)

Salary:
Basic 15k
KPI''S 5
Transportation allowance 
Commision (50-100 USD) per hired doctor 

Account nature:
Staffing agents contact physicans in America and offer them temporary positions in clinics. 

Shifts: Rotational and overnight between 4 PM to 4 AM

Location: Elboustan mall 9th floor Tahrir-down town', '2026-10-03 17:18:00');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (16, 11, 'الإنجليزية', 'C1', 10, 0, 'Telesales Agent (MEDICAL)', 10000, 150000, 'Monday 7:00 PM to 11:00PM - Tuesday 7:00 PM to 11:00PM - Wednesday 7:00 PM to 11:00PM - Friday 7:00 PM to 11:00PM', '2026-10-31', 5, 'Telesales Agent (MEDICAL)', '2026-10-03 17:24:11');
INSERT INTO "company_languages" ("id", "company_id", "language", "level", "needed_count", "filled_count", "position", "salary_min", "salary_max", "interview_time", "deadline", "notify_days", "description", "created_at") VALUES (17, 12, 'الإنجليزية', 'C1', 10, 0, 'MLA Telesales Representative | US Campaign', 12000, 15000, 'Monday to Friday 4:30PM till 8:30PM', '2026-10-31', 5, 'We are currently hiring MLA Telesales Representatives for our US Campaign.

Requirements:

✅ C1 English level (Required)
✅ Arabic speaker (Required)
✅ Previous telesales experience is a plus
✅ Minimum age: 20 years

Work Schedule:

📆 Monday to Friday
🕒 3:00 PM – 11:00 PM (Fixed Shift)
📅 Weekends Off (Saturday & Sunday)

Compensation & Benefits:

💰 Basic Salary: 12,000 EGP
(based on English level and interview performance) 
💸 Attractive Commissions
🎓 Paid probation and a bonus after passing
📍 Location: Makram Ebeid, Nasr City
🚫 No Transportation Provided
🚫 No Work From Home
🚫 No Part-Time Opportunities', '2026-10-03 17:27:36');

CREATE TABLE company_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

INSERT INTO "company_users" ("id", "company_id", "email", "password", "name", "is_active", "created_at") VALUES (1, 2, 'qweqwe@gmail.com', '$2b$10$ZNdjWYKJm5cR0n/.blV0ce.RwypK7HjmzJ0mEt8Yk9l6yZq2MbFWO', 'TTEC', 1, '2026-10-11 04:51:48');

CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER,
    company_id INTEGER,
    company_name TEXT NOT NULL,
    position TEXT NOT NULL,
    interview_time TEXT,
    salary REAL,
    salary_min REAL,
    salary_max REAL,
    description TEXT,
    language TEXT DEFAULT '',
    level TEXT DEFAULT '',
    needed_count INTEGER DEFAULT 1,
    deadline TEXT DEFAULT '',
    notify_days INTEGER DEFAULT 5,
    work_location TEXT DEFAULT '',
    employment_type TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, company_email TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (1, 6, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B1-B2', 1, '', 5, '', '', '2026-10-07 19:46:02', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (2, 6, 6, 'Leadbull', 'Canadian Telesales Account', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', NULL, 15000, 20000, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'الإنجليزية', 'B1-B2', 1, '', 5, '', '', '2026-10-07 19:46:02', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (3, 6, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B1-B2', 1, '', 5, '', '', '2026-10-07 19:46:02', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (4, 7, 2, 'TTEC', 'Dutch Sales Representative', 'Monday to Friday 11 am to 4pm', NULL, 64000, 64000, '📍 maadi
📂 Sales
💰 Up to EGP 64,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 45
🎓 Education: Graduate
📋 Experience: 💼 Minimum 1 year of Sales experience
💬 Strong communication skills
💻 Computer literacy & ability to handle systems efficiently

Job Responsibilities:
• Handle customer inquiries professionally.
• Provide accurate information and effective solutions.
• Ensure a high level of customer satisfaction.
• Maintain excellent communication with customers.
• Deliver an outstanding customer experience.

Work Conditions:
🕘 Rotational Shifts (9 hours – 24/7)
📅 2 Rotational Days Off

Salary & Benefits:
💰 Total Gross Salary: 64,000 EGP + Commission 
🏥 Medical Insurance
👥 Social Insurance
🚌 Transportation Provided (Collection Points)
🚖 Door-to-door transportation for females from 10:00 PM to 6:00 AM
✅ Ready to start on 7th Oct 
🗣️ Languages: English (B2), Dutch (B2+)

🎁 Benefits:
✅ Medical Insurance
✅ Social Insurance
✅ Paid Training
✅ transportation provided


📅 Work Schedule:
☀️ Rotational Shift
🕐 Shifts: Morning, Night, Overnight
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 8 hours and 1 hr break', 'الألمانية', 'B2', 1, '', 5, '', '', '2026-10-09 03:47:43', 'qweqwe@gmail.com');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (5, 1, 1, 'EClerx', 'Customer Support Specialists', 'sunday to thursday 1 PM to 5 PM', NULL, 20000, 21000, '📍 Location: Maadi Technology Park, Cairo

🕒 Rotational Night & 
Overnight Shifts

🎯 Requirements: • Graduates Only
• English Level: B2
•With BPO experience 
▪︎Egyptians wiz Max age 40 

💰 Salary Package (NET): • 15,500 EGP Basic Salary
• 2,300 EGP Night Allowance
• Up to 3,200 EGP KPI Bonus
✅ Total Net Package: 20K–21K Monthly

🎁 Benefits: • Medical Insurance (200K annual coverage)
• Family Medical Insurance Included
• Door-to-Door Transportation 🚍
• Amazing Career Growth Opportunities 📈', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-09 03:56:27', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (6, 14, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 09:02:14', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (7, 14, 6, 'Leadbull', 'Canadian Telesales Account', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', NULL, 15000, 20000, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 09:02:14', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (8, 14, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 09:02:14', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (9, 14, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 09:02:14', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (10, 14, 7, 'Winirix', 'Appointment Setter / Live Transfers', 'Online interview', NULL, 12000, 14000, 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 09:02:14', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (11, 15, 12, 'BIS', 'MLA Telesales Representative | US Campaign', 'Monday to Friday 4:30PM till 8:30PM', NULL, 12000, 15000, 'We are currently hiring MLA Telesales Representatives for our US Campaign.

Requirements:

✅ C1 English level (Required)
✅ Arabic speaker (Required)
✅ Previous telesales experience is a plus
✅ Minimum age: 20 years

Work Schedule:

📆 Monday to Friday
🕒 3:00 PM – 11:00 PM (Fixed Shift)
📅 Weekends Off (Saturday & Sunday)

Compensation & Benefits:

💰 Basic Salary: 12,000 EGP
(based on English level and interview performance) 
💸 Attractive Commissions
🎓 Paid probation and a bonus after passing
📍 Location: Makram Ebeid, Nasr City
🚫 No Transportation Provided
🚫 No Work From Home
🚫 No Part-Time Opportunities', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (12, 15, 10, 'Cxperts', 'Medical Account', 'Monday to Friday 1PM till 7PM', NULL, 15000, 20000, 'Requirements:
C1 English level
1-2 years of outbound sales/ lead generation experience ( medical, healthcare, or staffing industry preferred)

Salary:
Basic 15k
KPI''S 5
Transportation allowance 
Commision (50-100 USD) per hired doctor 

Account nature:
Staffing agents contact physicans in America and offer them temporary positions in clinics. 

Shifts: Rotational and overnight between 4 PM to 4 AM

Location: Elboustan mall 9th floor Tahrir-down town', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (13, 15, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (14, 15, 6, 'Leadbull', 'Canadian Telesales Account', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', NULL, 15000, 20000, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (15, 15, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (16, 15, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (17, 15, 7, 'Winirix', 'Appointment Setter / Live Transfers', 'Online interview', NULL, 12000, 14000, 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 10:20:18', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (18, 16, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 11:29:15', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (19, 16, 6, 'Leadbull', 'Canadian Telesales Account', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', NULL, 15000, 20000, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 11:29:15', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (20, 16, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 11:29:15', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (21, 16, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 11:29:15', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (22, 16, 7, 'Winirix', 'Appointment Setter / Live Transfers', 'Online interview', NULL, 12000, 14000, 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 11:29:15', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (23, 15, 9, 'TTC (US)', 'Telesales Agents (US Account) ', '', NULL, 15000, 15000, '⏰ Monday to Friday 3 Pm till 5 Pm
15000 - 15000 ج
✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 19:29:30', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (24, 20, 8, 'GeekyCX', 'Customer Service Representative – Bilingual Track (English & Spanish)', 'Tuesday 7PM till 10PM - Wednesday 7PM till 10PM - Friday 7PM till 10PM', NULL, 35000, 35000, 'Customer Service Representative – Bilingual Track (English & Spanish)

🎯 Requirements:
• C1 English proficiency
• C1 Spanish proficiency
• Clear & professional phone communication
• Strong listening skills
• Basic computer & CRM skills
• Customer service experience is a MUST
• Fresh graduates are welcome

💼 Responsibilities (Brief):
• Handle inbound & outbound calls with US clients
• Provide updates on debt relief accounts
• Address client concerns & escalate complex issues
• Maintain accurate CRM records
• Meet daily call & quality targets

Working Hours:
Night Shift (7 PM – 4 AM)

💰 Salary Package:
• Gross Salary: 35,000 EGP
• Paid Training
• Performance Bonuses

📍Location: On-site – Sheikh Zayed, Cairo', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:21:11', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (25, 20, 1, 'EClerx', 'Customer Support Specialists', 'sunday to thursday 1 PM to 5 PM', NULL, 20000, 21000, '📍 Location: Maadi Technology Park, Cairo

🕒 Rotational Night & 
Overnight Shifts

🎯 Requirements: • Graduates Only
• English Level: B2
•With BPO experience 
▪︎Egyptians wiz Max age 40 

💰 Salary Package (NET): • 15,500 EGP Basic Salary
• 2,300 EGP Night Allowance
• Up to 3,200 EGP KPI Bonus
✅ Total Net Package: 20K–21K Monthly

🎁 Benefits: • Medical Insurance (200K annual coverage)
• Family Medical Insurance Included
• Door-to-Door Transportation 🚍
• Amazing Career Growth Opportunities 📈', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:22:30', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (26, 20, 6, 'Leadbull', 'Canadian Telesales Account', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', NULL, 15000, 20000, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:22:55', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (27, 20, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:23:24', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (28, 21, 12, 'BIS', 'MLA Telesales Representative | US Campaign', 'Monday to Friday 4:30PM till 8:30PM', NULL, 12000, 15000, 'We are currently hiring MLA Telesales Representatives for our US Campaign.

Requirements:

✅ C1 English level (Required)
✅ Arabic speaker (Required)
✅ Previous telesales experience is a plus
✅ Minimum age: 20 years

Work Schedule:

📆 Monday to Friday
🕒 3:00 PM – 11:00 PM (Fixed Shift)
📅 Weekends Off (Saturday & Sunday)

Compensation & Benefits:

💰 Basic Salary: 12,000 EGP
(based on English level and interview performance) 
💸 Attractive Commissions
🎓 Paid probation and a bonus after passing
📍 Location: Makram Ebeid, Nasr City
🚫 No Transportation Provided
🚫 No Work From Home
🚫 No Part-Time Opportunities', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (29, 21, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (30, 21, 10, 'Cxperts', 'Medical Account', 'Monday to Friday 1PM till 7PM', NULL, 15000, 20000, 'Requirements:
C1 English level
1-2 years of outbound sales/ lead generation experience ( medical, healthcare, or staffing industry preferred)

Salary:
Basic 15k
KPI''S 5
Transportation allowance 
Commision (50-100 USD) per hired doctor 

Account nature:
Staffing agents contact physicans in America and offer them temporary positions in clinics. 

Shifts: Rotational and overnight between 4 PM to 4 AM

Location: Elboustan mall 9th floor Tahrir-down town', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (31, 21, 6, 'Leadbull', 'Canadian Telesales Account', 'Thursday 4:00pm to 11:00pm - Friday 4:00pm to 11:00pm', NULL, 15000, 20000, '🇨🇦 “Canadian Tele sales Account”

So easy to target it.

Offer:
💰 EGP 15K EGP Basic Salary
🎯 EGP 5K KPIs
💸 Daily spiffs
💸 Quarterly incentives
💸Annual profit share 

Job Details:
🕓 Shift: 4 PM – 1 AM 

Who We’re Looking For:
🗣️ B2+ English Level or above

📍 Company Location: Zahraa El Maadi
(Work from site)
Door to Door Trasportation for Females after Test Call

🌟 Availability to work from home after 3 months 🏠

Egyptians ONLY', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (32, 21, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (33, 21, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (34, 21, 7, 'Winirix', 'Appointment Setter / Live Transfers', 'Online interview', NULL, 12000, 14000, 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (35, 21, 11, 'SJL', 'Telesales Agent (MEDICAL)', 'Monday 7:00 PM to 11:00PM - Tuesday 7:00 PM to 11:00PM - Wednesday 7:00 PM to 11:00PM - Friday 7:00 PM to 11:00PM', NULL, 10000, 150000, 'Telesales Agent (MEDICAL)', 'الإنجليزية', 'B2-C1', 1, '', 5, '', '', '2026-10-10 22:25:35', 'Telesales Agent (MEDICAL)');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (36, 20, 7, 'Winirix', 'Appointment Setter / Live Transfers', 'Online interview', NULL, 12000, 14000, 'Position: Appointment Setter / Live Transfers
📍 Location: Nasr City
🕔 Working Hours: 5 PM – 2 AM
📅 Monday – Friday

💰 12,000 EGP Net + 2,000 EGP Allowance
💵 USD-based Commission starting from 15 APPTs/month

🎓 Paid Training & Probation

Requirements:
• Age: 20–35
• Graduates or students
• Previous Cold Calling experience
• English Level: B2+ / C1', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:25:42', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (37, 20, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:25:42', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (38, 20, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-10 22:25:42', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (39, 23, 12, 'BIS', 'MLA Telesales Representative | US Campaign', 'Monday to Friday 4:30PM till 8:30PM', NULL, 12000, 15000, 'We are currently hiring MLA Telesales Representatives for our US Campaign.

Requirements:

✅ C1 English level (Required)
✅ Arabic speaker (Required)
✅ Previous telesales experience is a plus
✅ Minimum age: 20 years

Work Schedule:

📆 Monday to Friday
🕒 3:00 PM – 11:00 PM (Fixed Shift)
📅 Weekends Off (Saturday & Sunday)

Compensation & Benefits:

💰 Basic Salary: 12,000 EGP
(based on English level and interview performance) 
💸 Attractive Commissions
🎓 Paid probation and a bonus after passing
📍 Location: Makram Ebeid, Nasr City
🚫 No Transportation Provided
🚫 No Work From Home
🚫 No Part-Time Opportunities', 'الإنجليزية', '', 1, '', 5, '', '', '2026-10-11 01:14:37', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (40, 27, 4, 'Evolve', 'PAS Patient Assistance Survey at Evolve Marketing LLC', 'Double check first', NULL, 10000, 20000, '📂 Tele Marketing
💰 Up to EGP 10,000 / Monthly
👤 Gender: Both
💂 Military: Completed
🌍 Nationality: Egyptians Only
🎂 Max Age: 29
🎓 Education: Graduate, Undergraduate, Gap Year, Dropped Out
📋 Experience: 🔥 Hiring | Telemarketer Agent – PAS
🏠 Sat & Sun Off
📄 6-Month Contract | On-site

💰 Package up to 20K EGP
• Basic + KPIs: 10K
• Commission: 2.2K–10K
• Daily spiffs, bonuses & incentives

📚 Paid Training: 1 month
🚗 Female transportation via meeting points after training
📌 Clear military status required for males

🗣️ Languages: English (B2+)

🎁 Benefits:
✅ Transportation provided for females only


📅 Work Schedule:
☀️ Fixed Shift
🕐 Shifts: Night
📆 Working Days: 5 working days and 2 days off 
⏰ Hours: 4:00 PM – 12:00 AM', 'الإنجليزية', 'B1-B2', 1, '', 5, '', '', '2026-10-11 16:50:24', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (41, 27, 5, 'LTS', 'Outbound Call Agent (USA Campaign)', 'Monday to Friday 4 Pm till 8 Pm', NULL, 12000, 14000, '🎯 Job Offer – Outbound Call Agent (USA Campaign) 🇺🇸

🕒 Fixed Shifts (Monday–Friday):
• 3:00 PM – 12:00 AM
• 3:30 PM – 12:30 AM
• 4:00 PM – 1:00 AM
• 4:30 PM – 1:30 AM
• 5:00 PM – 2:00 AM

📅 2 paid Saturdays/month

💼 Main Duties:
• Call recent hotel guests & conduct a quick 1–2 min survey ☎️
• Transfer the call to our USA call center 🌍
• Reach 11 transfers/day (250/month)
• Follow company policies & report any major client issue to your supervisor

✅ Requirements:
• Fluent English 💬
• Egyptians only 🇪🇬
• Excellent communication & listening skills
• Professional phone etiquette
• Computer literate
• Age: 18–35
• High school diploma or higher (experience is a plus)

💰 Salary & Commission:
• Base: 12,000 EGP + 2,000 KPIs
• Medical insurance after 3 months 🏥

📍 Location: Sheraton, Heliopolis – 1258 Autostrad Rd

📑 Required Documents:
بطاقة – شهادة ميلاد أصل – 4 صور شخصية – كعب عمل – برنت تأميني – فيش – شهادة مؤهل – شهادة الجيش – قيد جامعي', 'الإنجليزية', 'B1-B2', 1, '', 5, '', '', '2026-10-11 16:50:24', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (42, 27, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B1-B2', 1, '', 5, '', '', '2026-10-11 20:14:41', '');
INSERT INTO "jobs" ("id", "application_id", "company_id", "company_name", "position", "interview_time", "salary", "salary_min", "salary_max", "description", "language", "level", "needed_count", "deadline", "notify_days", "work_location", "employment_type", "created_at", "company_email") VALUES (43, 16, 9, 'TTC (US)', 'Telesales Agents (US Account)', 'Monday to Friday 3 Pm till 5 Pm', NULL, 15000, 15000, '✅ English B2+
✅ No experience
✅ Egyptians only (18–28 years old)
✅ Graduates, undergrads, gap years & dropouts – all welcome! 🙌

💰 What You’ll Get:
✨ 13,000 EGP Salary
✨ + Commissions starting from 2,000 EGP 💵
✨ Paid Training 🧠
✨ Transportation 🚐
 👩‍🦰 Females: Door-to-door service 🏠
 👨 Males: Nearest drop-off points 📍

🕒 Working Hours & Location:
🕓 Fixed shift: 3 PM – 11 PM (1-hour break included)
📅 Saturday & Sunday off – fixed weekends! 🎉', 'الإنجليزية', 'B2', 1, '', 5, '', '', '2026-10-13 22:19:59', '');

CREATE TABLE labor_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, labor_agent_id INTEGER NOT NULL, name TEXT NOT NULL, city TEXT DEFAULT '', is_working INTEGER DEFAULT 0, company_id INTEGER, earning_per_month REAL DEFAULT 0, working_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, labor_agent_amount REAL DEFAULT 0, position TEXT DEFAULT '');


CREATE TABLE labor_workers (id INTEGER PRIMARY KEY AUTOINCREMENT, labor_agent_id INTEGER NOT NULL, group_id INTEGER, full_name TEXT NOT NULL, age INTEGER, phone TEXT DEFAULT '', national_id TEXT DEFAULT '', city TEXT DEFAULT '', address TEXT DEFAULT '', id_card_front TEXT DEFAULT '', id_card_back TEXT DEFAULT '', status TEXT DEFAULT 'new', company_id INTEGER, earning_per_month REAL DEFAULT 0, working_at DATETIME, notes TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, labor_agent_amount REAL DEFAULT 0, company_approval TEXT DEFAULT '', position TEXT DEFAULT '');


CREATE TABLE leader_targets (id INTEGER PRIMARY KEY AUTOINCREMENT, team_leader_id INTEGER NOT NULL, month TEXT NOT NULL, target INTEGER NOT NULL DEFAULT 0, set_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(team_leader_id, month));


CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    agent_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (3, 5, NULL, 'rejection', 'تم رفض طلبك', 'After the assessment, the candidate''s English level was found to be B1. However, further improvement in fluency, vocabulary, and communication skills is needed to meet the required level. We recommend dedicating one month to focused practice and reassessing the candidate afterward, as they have the potential to improve.', 0, '2026-10-04 17:41:43');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (4, 5, NULL, 'rejection', 'تم رفض طلبك', 'مستوي اللغة B1 و ليس B2 يمكنك تحسين اللغه بواسطة اكتساب المزيد من الكلمات المتقدمه للتعبير عن الذات و ايضا معالجة بعض اخطاء القواعد و الطلاقه في الحديث', 0, '2026-10-04 19:08:54');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (5, 9, NULL, 'rejection', 'تم رفض طلبك', 'مستوي اللغه A2 و هو غير كاف و هناك نقاط يجب العمل عليها لتطوير ذاتك كالنطق و الفصاحه في الحديث لتبين التحدث بشكل طليق و سليم كما هو مطلوب و ايضا عليك بالعمل علي القواعد كثيرا و تنسيقها مع الافكار. ', 0, '2026-10-05 20:38:41');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (6, 15, NULL, 'rejection', 'تم رفض طلبك', 'بعد التقييم، مستوى اللغة الإنجليزية لديك حاليًا A2، وهو أقل من المستوى المطلوب للوظيفة.

ننصحك بالتركيز على تطوير الـ Speaking والـ Vocabulary والاستماع والممارسة اليومية، ومع الاستمرار هتقدر توصل لمستوى أفضل وتقدم مرة أخرى على فرص مناسبة لك.

بالتوفيق وإن شاء الله نشوفك قريبًا بمستوى أقوى. ❤️', 0, '2026-10-06 18:18:49');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (7, 17, NULL, 'rerecord', 'يرجى إعادة التسجيل', 'نرجو منك إعادة تسجيل صوتك مرة أخرى مع التأكد من جودة التسجيل.', 0, '2026-10-07 01:48:25');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (8, 17, NULL, 'rerecord', 'يرجى إعادة التسجيل', 'نرجو منك إعادة تسجيل صوتك مرة أخرى مع التأكد من جودة التسجيل.', 0, '2026-10-07 01:48:29');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (9, 17, NULL, 'rejection', 'تم رفض طلبك', 'للاسف لا يوجد اكونت عربي حاليا برجاء التقديم بعد توفير اكونت عربي ', 0, '2026-10-07 02:42:31');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (10, 19, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 1, '2026-10-07 19:38:06');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (11, 19, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 3 وظيفة جديدة إلى حسابك من المندوب.', 1, '2026-10-07 19:46:02');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (12, 5, NULL, 'reapply', 'تم السماح لك بالتقديم مجدداً', 'يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف.', 0, '2026-10-07 19:47:39');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (13, 21, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-09 03:45:54');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (14, 21, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 1 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 1, '2026-10-09 03:47:43');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (15, NULL, 8, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "Fathi Mohamed Fathi" تمت إضافة 1 وظيفة له.', 1, '2026-10-09 03:47:43');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (16, 22, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-09 03:47:54');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (17, 23, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 1, '2026-10-09 03:48:18');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (18, 5, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 1, '2026-10-09 03:55:00');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (19, 5, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 1 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 1, '2026-10-09 03:56:27');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (20, 27, NULL, 'rerecord', 'يرجى إعادة التسجيل', 'نرجو منك إعادة تسجيل صوتك مرة أخرى مع التأكد من جودة التسجيل.', 0, '2026-10-09 19:26:23');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (21, 32, NULL, 'rejection', 'تم رفض طلبك', 'بي رجاء ارسال نص صوتي بي الغه الإنجليزي ', 0, '2026-10-09 19:26:54');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (22, 29, NULL, 'rejection', 'تم رفض طلبك', 'بي رجاء ارسال نص صوتي بي الغه الإنجليزي', 0, '2026-10-09 19:27:14');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (23, 35, NULL, 'rejection', 'تم رفض طلبك', 'Keep practising! You’ll improve. Retest in one month.', 1, '2026-10-09 20:19:03');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (24, 27, NULL, 'rejection', 'تم رفض طلبك', 'للاسف لا يوجد لدينا اكونت عربي متاح حاليا عندما يتم أتاح سيتم إرسال لك رساله ', 0, '2026-10-09 22:59:28');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (26, 39, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-10 08:42:03');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (27, 39, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 5 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-10 09:02:14');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (28, 40, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-10 09:13:01');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (29, 40, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 7 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 0, '2026-10-10 10:20:18');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (30, NULL, 1, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "إبراهيم فتحي محمد" تمت إضافة 7 وظيفة له.', 0, '2026-10-10 10:20:18');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (31, 41, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-10 11:28:20');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (32, 41, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 5 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 0, '2026-10-10 11:29:15');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (33, NULL, 19, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "محمد محمود محمد حبيب" تمت إضافة 5 وظيفة له.', 1, '2026-10-10 11:29:15');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (34, 42, NULL, 'rejection', 'تم رفض طلبك', 'بي رجاء مراجعة رسائل الواتس اب ', 0, '2026-10-10 11:52:12');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (36, 40, NULL, 'selection_cancelled', 'تم إلغاء التوظيف', 'تم إلغاء توظيفك في شركة TTC (US) للوظيفة: Telesales Agents (US Account). يمكنك التقديم مرة أخرى في أي وقت.', 0, '2026-10-10 19:18:59');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (37, 39, NULL, 'selection_cancelled', 'تم إلغاء التوظيف', 'تم إلغاء توظيفك في شركة Evolve للوظيفة: PAS Patient Assistance Survey at Evolve Marketing LLC. يمكنك التقديم مرة أخرى في أي وقت.', 0, '2026-10-10 19:20:00');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (38, 40, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 1 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 0, '2026-10-10 19:29:30');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (39, NULL, 1, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "إبراهيم فتحي محمد" تمت إضافة 1 وظيفة له.', 0, '2026-10-10 19:29:30');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (40, 44, NULL, 'rejection', 'تم رفض طلبك', 'تم رفض طلبك. يرجى التدريب والتقديم مرة أخرى.', 0, '2026-10-10 19:52:30');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (41, 43, NULL, 'rejection', 'تم رفض طلبك', 'تم رفض طلبك. يرجى التدريب والتقديم مرة أخرى.', 0, '2026-10-10 19:54:52');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (42, 45, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-10 22:09:57');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (43, 45, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 1 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-10 22:21:11');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (44, 45, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 1 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-10 22:22:30');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (45, 45, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 1 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-10 22:22:55');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (46, 45, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 1 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-10 22:23:24');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (47, 48, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-10 22:24:30');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (48, 48, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 8 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 1, '2026-10-10 22:25:35');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (49, 45, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 3 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-10 22:25:42');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (50, 46, NULL, 'rejection', 'تم رفض طلبك', 'شكرًا لتقديمك عبر موقع وظّيف ❤️

نرى أن لديك القدرة على التطور وتحسين مستواك بسرعة، ومن الواضح أنك بذلتِ مجهودًا كبيرًا في التدريب.

شركة وظّيف تدعمك وتتمنى لكِ التوفيق، وندعوكِ للتقديم مرة أخرى بعد تحسين مستواك، فنحن نؤمن بقدرتك على التطور وتحقيق نتائج أفضل. 🌟', 0, '2026-10-10 22:29:18');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (54, NULL, 8, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "Test" تمت إضافة 1 وظيفة له.', 0, '2026-10-11 01:14:37');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (56, 57, NULL, 'rejection', 'تم رفض طلبك', 'للاسف لا يوجد اكونت عربي حاليا شكرا لي تقديمك في موقعنا 
وظيف♥️', 0, '2026-10-11 02:03:54');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (57, 58, NULL, 'rejection', 'تم رفض طلبك', 'Keep practising your English! We look forward to reassessing you in one month. Good luck!', 0, '2026-10-11 08:10:05');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (58, 62, NULL, 'rejection', 'تم رفض طلبك', 'للاسف لا يوجد اكونت عربي حاليا شكرا لي تقديمك في موقعنا وظيف♥️', 0, '2026-10-11 15:54:01');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (59, 61, NULL, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.', 0, '2026-10-11 16:48:20');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (60, 61, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 2 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 0, '2026-10-11 16:50:24');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (61, NULL, 19, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "Hamsa Kotb El-ashwal" تمت إضافة 2 وظيفة له.', 1, '2026-10-11 16:50:24');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (62, 41, NULL, 'selection_cancelled', 'تم إلغاء التوظيف', 'تم إلغاء توظيفك في شركة TTC (US) للوظيفة: Telesales Agents (US Account). يمكنك التقديم مرة أخرى في أي وقت.', 0, '2026-10-11 18:58:03');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (63, 34, NULL, 'rerecord', 'يرجى إعادة التسجيل', 'نرجو منك إعادة تسجيل صوتك مرة أخرى مع التأكد من جودة التسجيل.', 0, '2026-10-11 19:22:29');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (64, 64, NULL, 'rejection', 'تم رفض طلبك', 'للاسف لا يوجد اكونت عربي حاليا شكرا لي تقديمك في موقعنا وظيف♥️', 0, '2026-10-11 19:23:37');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (65, 61, NULL, 'jobs', 'تمت إضافة وظائف جديدة', 'تمت إضافة 1 وظيفة جديدة إلى حسابك من المندوب.', 0, '2026-10-11 20:14:41');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (66, 41, NULL, 'jobs_added', 'وظائف جديدة لك', 'تمت إضافة 1 وظيفة جديدة. افتح لوحة التحكم لعرضها.', 0, '2026-10-13 22:19:59');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (67, NULL, 19, 'referral_hired', 'تم توظيف شخص أحيله لك', 'العضو "محمد محمود محمد حبيب" تمت إضافة 1 وظيفة له.', 1, '2026-10-13 22:19:59');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (68, 34, NULL, 'rejection', 'تم رفض طلبك', 'تم رفض طلبك. يرجى التدريب والتقديم مرة أخرى.', 0, '2026-10-14 00:09:56');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (69, 40, NULL, 'selection_cancelled', 'تم إلغاء التوظيف', 'تم إلغاء توظيفك في شركة TTC (US) للوظيفة: Telesales Agents (US Account) . يمكنك التقديم مرة أخرى في أي وقت.', 0, '2026-10-14 06:19:24');
INSERT INTO "notifications" ("id", "user_id", "agent_id", "type", "title", "message", "is_read", "created_at") VALUES (70, 68, NULL, 'rejection', 'تم رفض طلبك', 'Keep practising your English! We look forward to reassessing you in one month. Good luck!', 0, '2026-10-14 07:27:18');

CREATE TABLE qualty_warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id INTEGER NOT NULL, issued_by INTEGER, issuer_role TEXT DEFAULT 'super_qualty', reason TEXT DEFAULT '', note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);


CREATE TABLE selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    status TEXT DEFAULT 'selected',
    hired INTEGER DEFAULT 0,
    amount REAL DEFAULT 0,
    agent_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_frozen INTEGER DEFAULT 1, unfrozen_at DATETIME, frozen_deadline DATETIME, apology TEXT, hired_at DATETIME, company_emailed INTEGER DEFAULT 0, company_decision TEXT, company_decision_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (1, 19, 3, 'selected', 0, 0, 0, '2026-10-07 20:15:53', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (2, 21, 4, 'selected', 0, 0, 0, '2026-10-09 20:00:20', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (3, 5, 5, 'selected', 0, 0, 0, '2026-10-09 20:08:12', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (4, 39, 6, 'cancelled', 0, 0, 0, '2026-10-10 10:24:45', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (5, 40, 16, 'cancelled', 0, 0, 0, '2026-10-10 10:42:44', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (6, 41, 21, 'cancelled', 0, 0, 0, '2026-10-10 12:41:15', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (7, 40, 23, 'cancelled', 0, 0, 0, '2026-10-10 19:31:58', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (9, 61, 41, 'selected', 0, 0, 0, '2026-10-11 17:33:14', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);
INSERT INTO "selections" ("id", "user_id", "job_id", "status", "hired", "amount", "agent_amount", "created_at", "is_frozen", "unfrozen_at", "frozen_deadline", "apology", "hired_at", "company_emailed", "company_decision", "company_decision_at") VALUES (10, 41, 43, 'selected', 0, 0, 0, '2026-10-13 22:20:35', 1, NULL, NULL, NULL, NULL, 0, NULL, NULL);

CREATE TABLE team_removal_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, team_leader_id INTEGER NOT NULL, agent_id INTEGER NOT NULL, reason TEXT DEFAULT '', status TEXT DEFAULT 'pending', resolved_by INTEGER, resolved_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

INSERT INTO "team_removal_requests" ("id", "team_leader_id", "agent_id", "reason", "status", "resolved_by", "resolved_at", "created_at") VALUES (1, 8, 17, 'قالي شغل تمام وكل لم عرف هنجيب C1 B2 هستصعب موضوع وعشان امام محكمه بقول تحكم عليه بالحذف دائم وشكرا لسيادات المحكمه
توقيعي:  7amo gaaahh', 'approved', 1, '2026-10-09 10:48:49', '2026-10-09 10:47:22');

CREATE TABLE team_warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, team_leader_id INTEGER NOT NULL, agent_id INTEGER NOT NULL, reason TEXT DEFAULT '', note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);


CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    referral_code TEXT,
    referred_by INTEGER,
    nationality TEXT,
    city TEXT,
    language_applied TEXT,
    age INTEGER,
    national_id TEXT,
    college TEXT,
    education_level TEXT,
    military_status TEXT,
    previous_application TEXT,
    call_center_experience TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  , qualty_languages TEXT, gender TEXT, language_level TEXT DEFAULT '', verification_code TEXT, email_verified INTEGER DEFAULT 0, code_expiry TEXT, reset_token TEXT, reset_token_expiry TEXT);

INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (1, 'محمد سامي', 'mohamed.sami.gawad@gmail.com', '$2b$10$yaO2WC6oMxzEXqp5gAoz.eFbHzmbB3lLxq20qCWpeR23BcJcjJ7QK', NULL, 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-26 23:52:39', NULL, NULL, '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (2, 'يوسف', 'Youssafmohamed999@gmail.com', '$2b$10$WbrsByTIDHIGE.WX7Dumw.apBThvwi4WQmDys8URo78eS5XtvvMB6', NULL, 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-26 23:52:40', NULL, NULL, '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (3, 'ادمن', '1stvampiresslayer@gmail.com', '$2b$10$xyjnvfvLftgPYWcQ7CP5AuPVeqLpz0TuFXVP7B65yveynhdhuQ9Ai', NULL, 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-26 23:52:41', NULL, NULL, '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (4, 'Amina', 'amina@gmail.com', '$2b$10$KgYZHHUpQV6QE0zg2aHnBup5PnLucm3.7BFFWM5sMLaTCy5oIznE6', NULL, 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-26 23:52:42', NULL, NULL, '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (5, 'Ehab Ahmed', 'hopaeldairy123@gmail.com', '$2b$10$1OFyJvMhTYVcjmTzrBjwF.SCz6ctxZ95E3DmLN35UHp1yYr544C2m', '01024909369', 'user', NULL, NULL, 'مصري', 'القليوبية - بنها', 'en', 25, '30109291400473', 'المعهد العالي للعلوم الاداريه', 'graduate', 'sole_provider', NULL, 'no', '2026-10-03 22:48:55', NULL, 'male', 'B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (6, 'اماني أحمد يحي', 'amanyahm62@gmail.com', '$2b$10$yV0L7SiYoYt3Yg..BLig/OPFQz/gg4QsyjzAIqnfDtOHUeIBqMrES', '01015501478', 'user', NULL, 8, 'مصري', 'الجيزة - المهندسين', 'en', 19, '30803192103223', 'اداب', 'undergraduate', 'na', NULL, 'no', '2026-10-04 11:49:01', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (7, 'Test', 'test001@gmail.com', '$2b$10$q6Y79SisqDaNpB8QRInG4Ot6v0OXbFdkKyslvzIjdcqZ9XrDr3Zba', '12345678901', 'user', NULL, 8, 'مصري', 'الجيزة - المهندسين', 'en', 23, '12345678901234', 'تجاره', 'graduate', 'sole_provider', NULL, 'yes', '2026-10-04 13:02:39', NULL, 'male', '', '734457', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (9, 'Mohamed Ashour', 'ashwr7590@gmail.com', '$2b$10$SZ5csCRYYcEHTMaxQ8fAKe.wZZcttLHSXCpVGcKTspeuP7RSC5iIq', '01276980078', 'user', NULL, 2, 'مصري', 'القاهرة - المرج', 'en', 22, '30411281300134', 'تجاره قسم اللغة الإنجليزية', 'graduate', 'exempt', NULL, 'no', '2026-10-04 15:59:30', NULL, 'male', 'A2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (10, 'عمر عادل احمد حسن ابراهيم', 'omarzook179@gmail.com', '$2b$10$yfRdX2FpN8MCQOCxDlmsxOxQlJIgmJq95nWGQV8RRNC5Xsgk1Np.m', '01227255830', 'user', NULL, 8, 'مصري', 'الإسكندرية - المنتزه', 'en', 18, '30801200202373', 'ثانوية عامة', 'undergraduate', 'postponed', NULL, 'no', '2026-10-04 17:14:53', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (11, 'الاء محمد أحمد', 'alaamoohammed1@gmail.com', '$2b$10$ae6fEXR9BRGDjO4aQLHXJO41vcZx6PjNAzK0I4Ul6dTqt8oYpz.q2', '01159725881', 'user', NULL, 8, 'مصري', 'القاهرة - مدينة نصر', 'ar', 22, '30410013200244', 'تجارة', 'undergraduate', 'na', NULL, 'yes', '2026-10-05 14:24:57', NULL, 'female', '', '210818', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (12, 'Ahmed Khalid Ahmed', 'ahmeelsokary090@gmail.com', '$2b$10$5qB2RP/bE3IIkboYoJ67JuNZ.rLwfaoWI/V4SUQL0TgZYabmbt3je', '01022579053', 'user', NULL, 8, 'مصري', 'الجيزة - 6 أكتوبر', 'en', 23, '30302012120834', 'اقتصاد وعلوم سياسيه', 'graduate', 'postponed', NULL, 'no', '2026-10-05 16:40:59', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (13, 'مريم محمد طلعت مجاهد', 'mariamtalaat316@.gmail.com', '$2b$10$fSwwRDefHQrw0gtKHoaKGO5fDZNnJSQdA7BYStRzMkodkcom79ijq', '01559973859', 'user', NULL, 2, 'مصري', 'الجيزة - أخرى', 'ar', 21, '30507242104783', 'معهد اكتوبر العالي للهندسه والتكنولوجيا', 'undergraduate', 'na', NULL, 'yes', '2026-10-05 18:12:18', NULL, 'female', '', '595339', 0, '2026-10-06T17:01:59.196Z', NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (14, 'Nour adel', 'noormubark77@gmail.com', '$2b$10$dB2xzL.szWztuZiI.nf2sOiZuAz1EQo159UeLL5OkOhxe/GQMN7zu', '01036869297', 'user', NULL, 8, 'مصري', 'الدقهلية - المنصورة', 'ar', 19, '30703308800909', 'العلاج طبيعي', 'undergraduate', 'na', NULL, 'no', '2026-10-05 23:10:04', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (15, 'مريم طلعت', 'mariamtalaat316@gmail.com', '$2b$10$uj5uyWw.5pr0E8otnSHzne2P7CUhQmqM009m..JBr9Y/bKOtw0Mzq', '01559973859', 'user', NULL, NULL, 'مصري', 'القاهرة - التجمع الخامس', 'en', 26, '30507242104783', 'اكتوبر العالي للهندسه والتكنولوجيا', 'undergraduate', 'na', NULL, 'yes', '2026-10-06 16:02:48', NULL, 'female', 'A2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (16, 'هاجر عاطف احمد ابراهيم', 'atefhager905@gmail.com', '$2b$10$rYMP0vhrE9K/Hy0lkyDw7uPLzjXnGavWiGCZr7ArUXZ4OQgcK9hMW', '01145783367', 'user', NULL, NULL, 'مصري', 'الدقهلية - ميت غمر', 'ar', 20, '30604011214441', 'الهندسه الزراعيه', 'undergraduate', 'na', NULL, 'no', '2026-10-06 21:49:47', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (17, 'عمر مختار محمد', 'om5028281@gmail.com', '$2b$10$BCsGxamlA8dmadwXBycAX.Tx.Z/3L9s6tPmK353YeKk6/NYJjEc4y', '01150914742', 'user', NULL, 1, 'مصري', 'القاهرة - السلام', 'ar', 21, '30404260105157', 'محاسبة ومراجعه', 'undergraduate', 'postponed', NULL, 'yes', '2026-10-07 01:13:56', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (18, 'احمد', 'mowjw8@gmail.com', '$2b$10$F.rB441usAcxi7kZDzVsFOElf9.6sq8R4rnOKEl37mAEmsGAamg0y', '01139993909', 'user', NULL, 2, 'مصري', 'القاهرة - عين شمس', 'en', 25, '29298282288383', 'Computer science', 'undergraduate', 'sole_provider', NULL, 'yes', '2026-10-07 16:25:09', NULL, 'male', '', '346217', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (19, 'عمر عفيفي محمد', 'afifoomar2009@gmail.com', '$2b$10$.Ci5EVRT.z8lpmOgUSV2N.V4xFl1otYFiTIInw5w8NE.BJTa4/3/a', '01551705235', 'user', NULL, 8, 'مصري', 'القاهرة - المرج', 'en', 19, '30707110105194', 'كلية التربية', 'undergraduate', 'postponed', NULL, 'no', '2026-10-07 18:18:27', NULL, 'male', 'B1-B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (20, 'Ibrahim Samir hassan', 'anabendary84@gmail.com', '$2b$10$kB0ERavIE1voTz4cbw0Yxu.nyeJ7tSLDxjt6GGkfbr6E35degcpyK', '01044221807', 'user', NULL, 8, 'مصري', 'القليوبية - قليوب', 'en', 20, '30601081401355', 'Faculty of law', 'undergraduate', 'postponed', NULL, 'no', '2026-10-08 12:26:07', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (21, 'Fathi Mohamed Fathi', 'fm2272446@gmail.com', '$2b$10$LzivqH0WDFUISk.AgLZWy.4ZjqG7ESzjy0tMbJNrwhIuaVGv8/NqS', '01147382179', 'user', NULL, 8, 'مصري', 'القاهرة - حلوان', 'de', 31, '29506130102077', 'كليه تعليم فني', 'graduate', 'exempt', NULL, 'no', '2026-10-08 12:41:31', NULL, 'male', 'B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (22, 'محمد شعبان صالح محمد', 'mohamedshabaan163@gmail.com', '$2b$10$5/ckTyl2HYWdyyFGojlzyecmHc2P.Loc3ZzBS1odlR1uqPEqHkYB2', '01090132575', 'user', NULL, 8, 'مصري', 'القاهرة - السلام', 'ru', 23, '53521698735481', 'هندسة ميكاترونيكس', 'graduate', 'exempt', NULL, 'yes', '2026-10-08 17:26:23', NULL, 'male', 'B2-C1', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (23, 'كيرلس نشأت منير شكرالله', 'kerelosnashaaat159@gmail.com', '$2b$10$6kx9n4wc2lqeLo3l7xuNDeBf/lU4uAkSu3bsMfL.XVFVykQ7GlYii', '01282851311', 'user', NULL, 8, 'مصري', 'الجيزة - 6 أكتوبر', 'es', 19, '30711112103919', 'السن قسم اسباني', 'undergraduate', 'postponed', NULL, 'yes', '2026-10-08 17:36:25', NULL, 'male', 'B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (24, 'سما محمد عبد الرحمن', 'samamabdelrahman38@gmail.com', '$2b$10$Uh5HtcuYHDJeNeSUWWr6JuMP9Ox76Vl1GxsxdPU2b8AZaNUZEdbmO', '01142072023', 'user', NULL, 8, 'مصري', 'القاهرة - السلام', 'en', 19, '30707120101863', 'معهد الالسن بمدينه نصر', 'undergraduate', 'na', NULL, 'yes', '2026-10-08 23:10:18', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (25, 'زياد عبد الحميد مبروك', 'jokerzyad123@gmail.co', '$2b$10$0IzLbGewfTM3eHJdMSHfNOQle9NV5xB.ym9OWb5IuSbLu6W18DXjC', '01102643280', 'user', NULL, 1, 'مصري', 'الجيزة - الهرم', 'ar', 18, '30803032104673', 'تربية', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 06:32:40', NULL, 'male', '', '581585', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (26, 'عبدالرحمن احمد عبدالفتاح احمد', 'abd.elrahman.169900@gmail.com', '$2b$10$t.uQbG5u0Ls/iRe/EILf.ORHrg/Vj3xC196DXmlQSvZyGFdiHgETy', '01122632078', 'user', NULL, NULL, 'مصري', 'الجيزة - الهرم', 'ar', 18, '30804230106017', 'تربيه انجليزي', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 09:07:59', NULL, 'male', '', '941717', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (27, 'ياسين سلام محمود', 'yasynslamabwtalb55@gmail.com', '$2b$10$YkS7yjpUzgT4oz04CGnkYO7S7AWdZROoHUpRRS7lkfbW35idyD.sS', '01030421648', 'user', NULL, 1, 'مصري', 'الجيزة - البدرشين', 'ar', 18, '30902190601674', 'كلية تربيه بنين بالقاهره', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 10:45:37', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (28, 'Moaaz Mohamed Eweis', 'moaaz.mohamed.eng@gmail.com', '$2b$10$fb/.SMPwlJB.UV0l.F1Z3eeoKCAe/0CziMhP6fgr7WJNJajlUP0T2', '01003219353', 'user', NULL, 8, 'مصري', 'القاهرة - المعادي', 'en', 19, '30701010107574', 'هندسة', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 11:34:23', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (29, 'محمود محمد على عبدالله', 'bajajx6@gmail.com', '$2b$10$qn.rURms/WG0Qe6FURY/euG7ivcrVEOvsIbV0aighSmuxSc7vEYCO', '01102502179', 'user', NULL, 1, 'مصري', 'الجيزة - إمبابة', 'ar', 19, '30708242101038', 'تربية انجليزى', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 12:38:50', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (30, 'ابراهيم أسامه صالح احمد', 'i52582654@gmail.com', '$2b$10$Y7wyKXKF2MKF0LedassbA.KiyxeQB7dkTY3Ktz54Mhw2jKd9EC8gy', '01155370852', 'user', NULL, 1, 'مصري', 'الجيزة - إمبابة', 'ar', 18, '30805072101939', 'علوم', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 13:07:04', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (31, 'بلال حسن', 'blalhassan915@gmail.com', '$2b$10$v8y.QhRP7LFW8c6TbPTbTOLGnZwMTS.YAboGSIkQ193082eyINsTy', '01283046306', 'user', NULL, 1, 'مصري', 'بني سويف - بني سويف', 'ar', 18, '30802022200716', 'تربيه', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 14:53:51', NULL, 'male', '', '848289', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (32, 'محمد مصطفى صب', 'mohamedgad255208@gmail.com', '$2b$10$8wXqxg44gt6.NURi/Hnteuk90lKW/D6L7GpNKplFZ8tmxAmq1fqvG', '01149374835', 'user', NULL, 1, 'مصري', 'القاهرة - عين شمس', 'ar', 18, '30903020101533', 'تربيه انجليزي', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 15:32:25', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (33, 'أحمد إبراهيم بيومي', 'ahmedeprahim851@gmail.com', '$2b$10$PZXViM8CGxamrH9LLWwBUeF65G2/RO08lb.Wa.d2DC3WpXkuwRGEq', '01026984152', 'user', NULL, 1, 'مصري', 'الفيوم - سنورس', 'ar', 19, '30703102302953', 'كلية تربية إنجليزي', 'undergraduate', 'postponed', NULL, 'yes', '2026-10-09 17:23:00', NULL, 'male', '', '602397', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (34, 'Hadeer saub', 'shdyr7961@gmail.com', '$2b$10$5mL5JbZ.RZplLWj9i.0VQu6OS2xamvPEEUsPUSZ7YDXcWLGQjP8EC', '01155256375', 'user', NULL, 2, 'مصري', 'القاهرة - المعادي', 'ar', 22, '30405180102641', 'القاهره', 'graduate', 'na', NULL, 'yes', '2026-10-09 18:46:05', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (35, 'يارا خالد مختار', 'yarakhaleed@icloud.com', '$2b$10$mPF3bytsQOQWuvEBnIQhPOFRr7cAqHa9PCiQ.spPx3nhJSg3m3jyC', '01099264649', 'user', NULL, 2, 'مصري', 'القاهرة - مصر الجديدة', 'ar', 25, '30105050102069', 'Business information system', 'graduate', 'na', NULL, 'yes', '2026-10-09 19:19:41', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (36, 'محمد علام حسن', 'remontadabsh@gmail.com', '$2b$10$F0MUa.T83NwDgl8g5bbk2uozeix21vOpLJNP40nyiYQwM5.Rk4D16', '01033821204', 'user', NULL, 1, 'مصري', 'الجيزة - 6 أكتوبر', 'ar', 21, '30611102103711', 'تربيه انجليزي', 'undergraduate', 'postponed', NULL, 'no', '2026-10-09 19:43:06', NULL, 'male', '', '339302', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (37, 'شهد طارق فرغلي', 'shahouddatarek@gmail.com', '$2b$10$Fav4tK6iEpu/MqHSKJoN7eVzI/wwwnjx3ra0mDUrEX05CSAC9bxre', '01284038514', 'user', NULL, 2, 'مصري', 'الغربية - طنطا', 'ar', 23, '30304052900516', 'الهندسه', 'undergraduate', 'na', NULL, 'yes', '2026-10-09 19:51:06', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (38, 'عهد إبراهيم رمضان', 'ahdibraheemomar@gmail.com', '$2b$10$5yog9C1Vnt8oqKV9VISbFeF7xFB2kqqMfPPRtpHA3ECzMDIB1opxG', '01012211101', 'user', NULL, 2, 'مصري', 'جنوب سيناء - الطور', 'ar', 22, '30405123500088', 'الحقوق', 'graduate', 'na', NULL, 'yes', '2026-10-09 22:27:34', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (39, 'Karim Ahmed Ebrahim', 'karimelhagar.cs@gmail.com', '$2b$10$4SLCr/1qtfZkOBt/DeDkpubOPbJht2V7.WzmJlmAVJNU0hlS0tT7G', '01043902966', 'user', NULL, 8, 'مصري', 'الشرقية - العاشر من رمضان', 'en', 18, '30810141300217', 'Computer science', 'undergraduate', 'postponed', NULL, 'no', '2026-10-10 06:52:28', NULL, 'male', 'B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (40, 'إبراهيم فتحي محمد', 'hemaasdfgggg@gmail.com', '$2b$10$sx1UxT.Duovbts.5pp0knetce50q9uLwd8FGZ.qgpM9OLeiNulR72', '01150542706', 'user', NULL, 1, 'مصري', 'القاهرة - المرج', 'en', 18, '30806010108518', 'تربية انجلش', 'undergraduate', 'postponed', NULL, 'no', '2026-10-10 08:24:16', NULL, 'male', 'B2-C1', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (41, 'محمد محمود محمد حبيب', 'moamedabib7@gmail.com', '$2b$10$ZfyGeTOWuLlspcaSme9KzeHCJ8/L9C03ijqoKkCUWmxDBg6bg4.XO', '01069396269', 'user', NULL, 19, 'مصري', 'الغربية - المحلة الكبرى', 'en', 21, '30607271603351', 'طب بشري', 'undergraduate', 'postponed', NULL, 'yes', '2026-10-10 11:08:02', NULL, 'male', 'B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (42, 'Ahmed mahmoud', 'a01122902434@gmail.com', '$2b$10$FNghy64AHD4Q2uKv8K6WlukgMakI6NVkaNie7vdIIMoDehh/B98ce', '01003644464', 'user', NULL, 1, 'مصري', 'البحيرة - أخرى', 'ar', 17, '30903091801166', 'تربية انجليزى', 'undergraduate', 'postponed', NULL, 'no', '2026-10-10 11:14:09', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (43, 'محمد حمدى مبارك احمد', 'mhmdhmdy8025@gmail.com', '$2b$10$pmeA6bRRakf1cvjoBOp0eun39ebniRI.tb9KfyWEbNAD/QhaYpvZu', '01101614765', 'user', NULL, 19, 'مصري', 'الإسكندرية - سموحة', 'en', 22, '30406050201555', 'سياحة و فنادق', 'undergraduate', 'postponed', NULL, 'yes', '2026-10-10 11:43:42', NULL, 'male', 'A2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (44, 'حماد إبراهيم حماد', 'hmmadebrahim5@gmail.com', '$2b$10$yMlL1aUh8ZkqBqbiHz/WRevWgA..wuAgHoPannbNU28BykMrB6sZa', '01060680653', 'user', NULL, 8, 'مصري', 'القاهرة - مدينة نصر', 'en', 21, '30510121702137', 'اللغه العربيه', 'undergraduate', 'postponed', NULL, 'no', '2026-10-10 18:34:17', NULL, 'male', 'B1', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (45, 'Bassant Nassr Abdelkader', 'Basnt.nassr@gmail.com', '$2b$10$B9CkN3LSOUSg7o26DvHN2.ZlDl89OgP/VDMEd1f3hMCoTwhLQ4nE.', '01141667016', 'user', NULL, 22, 'مصري', 'الإسكندرية - سموحة', 'en', 29, '29612150203061', 'اداب انجلش', 'graduate', 'na', NULL, 'no', '2026-10-10 20:46:41', NULL, 'female', 'B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (46, 'نورهان محمد', 'nwnwnwrnwrs392@gmail.com', '$2b$10$bt9dGm3bHEz.UGj4sAwnDeld1d8s0F7rKvEIOAVtzV4Vw3jgLyw.2', '01096679547', 'user', NULL, 7, 'مصري', 'دمياط - دمياط', 'en', 20, '20196385635247', 'تربيه', 'undergraduate', 'na', NULL, 'no', '2026-10-10 21:20:22', NULL, 'female', 'A2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (47, 'Mahmoud Muhammad Yehia', 'yehiamahmoud925@gmail.com', '$2b$10$X6yz09IsqLpH.ofdpKnsH.7SQmV2WIVRRMHrRvendBpUXvVGp.hlK', '01119918738', 'user', NULL, 7, 'مصري', 'القاهرة - حلوان', 'ar', 24, '30112200101933', 'Institute of computer and business administration', 'graduate', 'postponed', NULL, 'yes', '2026-10-10 21:42:13', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (48, 'Ghaly', 'gh76707670@gmail.com', '$2b$10$PEEFlbxmq0aglArUMgNtHuQHtJXbD2zAjUvA.eC201nGMwGauMP/i', '01036847400', 'user', NULL, NULL, 'مصري', 'الجيزة - 6 أكتوبر', 'en', 20, '12345678901234', 'تجاره', 'undergraduate', 'exempt', NULL, 'yes', '2026-10-10 22:11:10', NULL, 'male', 'B2-C1', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (51, 'Maryem Mahmoud', 'maimahmoud704@gmail.com', '$2b$10$m.4U1B6lhDmgMxbM7FH2K.cfKU2iy582fSS07hbJEIsE9a5Jro9OW', '01112782364', 'user', NULL, 7, 'مصري', 'القاهرة - بدر', 'ar', 24, '30111100104424', 'حاسبات ومعلومات', 'graduate', 'na', NULL, 'no', '2026-10-10 23:01:21', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (52, 'عبدالله محمد مسعد', 'mosaadabdullah886@gmail.com', '$2b$10$fz0zdiFfIPhkDs5TyOCn3uaq65qLVtn/CPwooPsFd7B/6s8O/beWy', '01122417934', 'user', NULL, 22, 'مصري', 'القاهرة - المعادي', 'en', 25, '30103041400771', 'آداب', 'undergraduate', 'postponed', NULL, 'no', '2026-10-10 23:05:27', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (53, 'محمود عرفه محمد', 'mahmoudarafa@gmail.com', '$2b$10$yQyg08MkOW3X8yG7.cmXBeMjfH6Mmy2HkkZz7P4ea0RD.LyyTTGey', '01115808308', 'user', NULL, 22, 'مصري', 'القاهرة - أخرى', 'en', 20, '34649495994946', 'تربيه', 'graduate', 'exempt', NULL, 'yes', '2026-10-10 23:17:38', NULL, 'male', '', '259166', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (54, 'محمود عرفه محمد', 'mahmoudarafa1011@mail.com', '$2b$10$4J4/4DXemz2DMXLkALmzDeJSpeq97R7OMr.khdPs7I3th3.92jl1W', '01115808308', 'user', NULL, 22, 'مصري', 'القاهرة - أخرى', 'en', 20, '34649495994946', 'تربيه', 'graduate', 'exempt', NULL, 'yes', '2026-10-10 23:21:28', NULL, 'male', '', '239096', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (55, 'Jana Hafez', 'ghafez2007@gmail.com', '$2b$10$hx3PvOZeWKzykZTc0mEgTuv5cYVrowTWW/nNDu802EpvOifTJTeui', '01207727278', 'user', NULL, 7, 'egypt', 'Monufia - Sadat City', 'en', 19, '30707241602487', 'Information Technology', 'undergraduate', 'na', NULL, 'no', '2026-10-11 00:54:01', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (56, 'yusuf hussein ali', 'repofree5@gmail.com', '$2b$10$txgw7kpBDDni0C/ltTCKW.1.LUIt7toGjx75fOIZZe8nqBlmHWCHy', '01142310143', 'user', NULL, 7, 'egypt', 'Cairo - Nahda', 'en', 18, '30710210102037', 'bis', 'undergraduate', 'postponed', NULL, 'no', '2026-10-11 01:44:30', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (57, 'Ahmed Maher Ali', 'ahmed103432138@gmail.com', '$2b$10$rQpOyrFGizCdePrWmDfp1Ojb2A0ZhS.lLXsvMXB0sRa2RG2ZguS/O', '01033713843', 'user', NULL, 21, 'egypt', 'Giza - Other', 'ar', 34, '29205020100877', 'New cairo academy', 'graduate', 'exempt', NULL, 'yes', '2026-10-11 01:54:13', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (58, 'Ziad saber abdullah', 'ziadsaber505@gmail.com', '$2b$10$zd84fw5jrSVniesiTedpouAqBVAvqZ3yxQ17xo5vWOJs4ypqdKNjG', '01140667783', 'user', NULL, 7, 'egypt', 'Giza - Faisal', 'en', 21, '30503282104292', 'Business Information system', 'undergraduate', 'postponed', NULL, 'no', '2026-10-11 06:27:13', NULL, 'male', 'A2-B1', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (59, 'Shahd omar mohamed abo El fotouh hassan', 'shahdoma72@gmail.com', '$2b$10$rX4IHbiTBd2Mrl2UfjExTefqPml8VVw26KvHGcSV2ugiDQQkIfF1K', '01014190659', 'user', NULL, 7, 'egypt', 'Qena - Other', 'en', 19, '30706202703741', 'English Education, Assiut University', 'undergraduate', 'na', NULL, 'no', '2026-10-11 06:40:13', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (60, 'Noura Mohamed', 'nouraelazab58@gmail.com', '$2b$10$7wd4ddfCzL4IpoAFfIHMveWAL8NGq7wHmJNvoL2d8Jpg4AlsrBaHy', '01019741871', 'user', NULL, 8, 'egypt', 'Dakahlia - Talkha', 'en', 21, '30505181201427', 'Faculty of languages and translation', 'undergraduate', 'na', NULL, 'no', '2026-10-11 08:10:51', NULL, 'female', '', '768572', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (61, 'Hamsa Kotb El-ashwal', 'hamsakotb54@gmail.com', '$2b$10$oD5H0FJZdj4ip9/N/fd9QO1ONTT.cWc2P0bbImaLU3JK3u8s3HPeW', '01555989761', 'user', NULL, 19, 'egypt', 'Gharbia - Tanta', 'en', 20, '30511271600487', 'Physical therapy', 'undergraduate', 'na', NULL, 'no', '2026-10-11 09:43:52', NULL, 'female', 'B1-B2', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (62, 'Clara Ezzat AZMI', 'ezzatclara3@gmail.com', '$2b$10$ciyBNTkbxKI2XoTk7JdzzOS7MGN/WlHk2yn04XjKSLV5DXohzeTW6', '01284237610', 'user', NULL, 10, 'egypt', 'Cairo - Other', 'ar', 24, '30204142200448', 'Faculty of Education', 'graduate', 'na', NULL, 'yes', '2026-10-11 09:57:04', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (63, 'Ahmed hassn sailh', 'ahmedhassn23@gmail.com', '$2b$10$cjwRlXjszlj9xpQT7G6LterChXQXK.JtUdBdxEn6mIV0MjrSCbUsC', '01149160486', 'user', NULL, 8, 'other', 'Giza - Haram', 'en', 25, '30109011301413', 'Mls', 'graduate', 'exempt', NULL, 'yes', '2026-10-11 11:11:32', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (64, 'Mahmoud Abdelaziz', 'mwad9625@gmail.com', '$2b$10$waqD35UdOMO/lBoxgv1PF.KrC5q6qQOg5qAA7.03LfbScgvh6Mp.2', '01214822510', 'user', NULL, 26, 'egypt', 'Damietta - Damietta New', 'ar', 21, '30504251202837', 'engineering', 'undergraduate', 'postponed', NULL, 'yes', '2026-10-11 18:42:53', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (65, 'Jannah mohamed abd el wahed abo el ainain', 'min.eric.93@gmail.com', '$2b$10$Und0kF3SRaMexrEZ/9UxKeBeYCipiYVwxmXXMR4FF7DIKwMBXwNsq', '01146631538', 'user', NULL, NULL, 'egypt', 'Dakahlia - Meet Ghamr', 'ar', 18, '30809011213489', '.Arts, Information and Knowledge Technologies', 'undergraduate', 'na', NULL, 'no', '2026-10-12 00:16:56', NULL, 'female', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (66, 'Hazem Mohamed Ahmed', 'hazem998899@gmail.com', '$2b$10$UzKUk5wJswNIFs5DGHfQDuIgdbdPWvfNzN7TyrD6te46N/lr.61IO', '01211753524', 'user', NULL, 8, 'egypt', 'Alexandria - El Raml', 'de', 25, '30108090200836', 'Faculty of Commerce', 'graduate', 'sole_provider', NULL, 'no', '2026-10-14 00:23:39', NULL, 'male', '', NULL, 1, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (67, 'Mohammed walyy', 'madololy03@gmail.com', '$2b$10$Fbbvbgj3yJ0EphPYNd0B/ej8oN2iJvPZrrkDzaNJE5CDUYgx8aib2', '01066316605', 'user', NULL, 19, 'egypt', 'Cairo - 5th Settlement', 'en', 23, '30306270202256', 'Dentistry', 'graduate', 'exempt', NULL, 'no', '2026-10-14 07:13:41', NULL, 'male', '', '684381', 0, NULL, NULL, NULL);
INSERT INTO "users" ("id", "name", "email", "password", "phone", "role", "referral_code", "referred_by", "nationality", "city", "language_applied", "age", "national_id", "college", "education_level", "military_status", "previous_application", "call_center_experience", "created_at", "qualty_languages", "gender", "language_level", "verification_code", "email_verified", "code_expiry", "reset_token", "reset_token_expiry") VALUES (68, 'Mohammed walyy', 'mohammedwalyy981@gmail.com', '$2b$10$uzxKC15FzAGuHxCB.SBLg.G9b62nuuQXXK4g40CxPp9VptBjF.6HS', '01066316605', 'user', NULL, 19, 'egypt', 'Cairo - 5th Settlement', 'en', 23, '30306270202256', 'Dentistry', 'graduate', 'exempt', NULL, 'no', '2026-10-14 07:14:26', NULL, 'male', 'B1', NULL, 1, NULL, NULL, NULL);

