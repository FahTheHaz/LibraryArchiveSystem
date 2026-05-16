-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 04, 2026 at 02:54 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `las_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `account`
--

CREATE TABLE `account` (
  `UserID` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `PassHash` varchar(255) NOT NULL,
  `RoleID` int(11) NOT NULL,
  `status` enum('inactive','active','banned') NOT NULL DEFAULT 'inactive',
  `DateCrated` datetime DEFAULT current_timestamp(),
  `IsVerified` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `account`
--

INSERT INTO `account` (`UserID`, `username`, `Email`, `PassHash`, `RoleID`, `status`, `DateCrated`, `IsVerified`) VALUES
(1, 'testuser_5304', 'testchange_5806@example.com', '$2y$10$n5gKNakCwXaMZHa9LDTNNuzTlcumoYgVmHSIsUF2/jm4PdzLUMc0i', 1, 'active', '2026-02-21 10:36:52', 1),
(3, 'staff1', 'staff1@library.edu', '$2y$10$YUUqLcoTlUrjinXOt7Y8seHaCz3fKg/AjYuJGp3/NvIBOdjWZDNLm', 1, 'active', '2024-01-15 09:00:00', 0),
(4, 'staff2', 'staff2@library.edu', '$2y$10$cPlm5QqM39yzIbk3V6MYc.Xn3i3HjH26zAOovbPRpTZkOnBgk4jLe', 1, 'active', '2024-02-20 10:30:00', 0),
(5, 'user1', 'user1@example.com', '$2y$10$AwlTrICo6ke06jrE.VMYdOKEyvqJziHTLbc8J2DVu9B2JlvBzobBq', 1, 'active', '2024-03-10 11:45:00', 0),
(6, 'user2', 'user2@example.com', '$2y$10$UpGOVHQT7oeLgiEUnmRXnu0JbMHyCU8adDa.ujdaNFzOtdtrh5Dze', 2, 'active', '2024-04-05 14:20:00', 0),
(7, 'user3', 'user3@example.com', '$2y$10$AG5vzFLm0o6pSLzsCxAxrOCsizdZ.zTeCF4.Fw.r.pG9vPEeZ1NPy', 2, 'active', '2024-05-12 08:15:00', 0),
(19, 'staffactual2', 'staffactual2@library.edu', '$2y$10$QBTfWChwdyxHE70LAKLaaOumyQsE5g4Lj/Hs0Ba3.r5YOAUeByLtm', 3, 'active', '2024-02-20 10:30:00', 0),
(22, 'fahim_haz', 'fahimhaziq1@gmail.com', '$2y$10$IrfdEhZPLiXXCGl5j13sKeWslNXPKbyddQ21lmSEMEEz8Wlx/ogru', 2, 'active', '2026-05-04 19:20:37', 1);

-- --------------------------------------------------------

--
-- Table structure for table `activity`
--

CREATE TABLE `activity` (
  `LogID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `IPAddress` varbinary(16) DEFAULT NULL,
  `ActionType` varchar(63) NOT NULL,
  `Describtion` varchar(255) NOT NULL,
  `ActTime` datetime DEFAULT current_timestamp(),
  `targetFileID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity`
--

INSERT INTO `activity` (`LogID`, `UserID`, `IPAddress`, `ActionType`, `Describtion`, `ActTime`, `targetFileID`) VALUES
(1, 1, 0x7f000001, 'LOGIN', 'User testuser_5304 logged in.', '2026-05-04 18:53:19', NULL),
(2, 1, 0x7f000001, 'BROWSE', 'Browsed archive', '2026-05-04 18:53:20', NULL),
(3, 1, 0x7f000001, 'BROWSE', 'Browsed archive', '2026-05-04 18:53:20', NULL),
(4, 1, 0x7f000001, 'DOWNLOAD', 'Downloaded FileID: 255 (PHOTO)', '2026-05-04 18:53:20', 255),
(5, 1, 0x7f000001, 'DOWNLOAD', 'Downloaded FileID: 256 (PHOTO)', '2026-05-04 18:53:20', 256),
(6, 1, 0x7f000001, 'DOWNLOAD', 'Downloaded FileID: 254 (PHOTO)', '2026-05-04 18:53:20', 254),
(7, NULL, 0x7f000001, 'REGISTER_FAIL', 'DB error | username:fahim_haz', '2026-05-04 19:11:10', NULL),
(8, NULL, 0x7f000001, 'REGISTER_FAIL', 'DB error | username:fahim_haz', '2026-05-04 19:13:41', NULL),
(9, 22, 0x7f000001, 'REGISTER', 'New account registered | username:fahim_haz', '2026-05-04 19:20:43', NULL),
(10, 1, 0x7f000001, 'ADMIN:BAN', 'BAN USER 6', '2026-05-04 19:29:21', NULL),
(11, 1, 0x7f000001, 'ADMIN:UNBAN', 'UNBAN USER 6', '2026-05-04 19:29:22', NULL),
(12, 1, 0x7f000001, 'ADMIN:UNBAN', 'UNBAN USER 22', '2026-05-04 19:29:23', NULL),
(13, 1, 0x7f000001, 'ADMIN:VERIFY', 'Approved account for UserID: 22', '2026-05-04 19:29:34', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `archive`
--

CREATE TABLE `archive` (
  `FileID` int(11) NOT NULL,
  `DateUploaded` datetime DEFAULT current_timestamp(),
  `FileType` enum('PAPER','PHOTO') DEFAULT NULL,
  `UploadedBy` int(11) NOT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `filePath` varchar(255) DEFAULT NULL,
  `CategoryID` int(11) DEFAULT NULL,
  `folderID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `archive`
--

INSERT INTO `archive` (`FileID`, `DateUploaded`, `FileType`, `UploadedBy`, `deletedAt`, `filePath`, `CategoryID`, `folderID`) VALUES
(11, '2024-06-01 10:00:00', 'PAPER', 1, NULL, '/uploads/papers/math101_syllabus.pdf', NULL, NULL),
(22, '2024-06-05 11:30:00', 'PAPER', 1, NULL, '/uploads/papers/physics_lab_report.pdf', NULL, NULL),
(23, '2024-06-05 11:30:00', 'PAPER', 3, NULL, '/uploads/papers/physics_lab_report.pdf', NULL, NULL),
(35, '2024-06-01 10:00:00', 'PAPER', 1, NULL, '/uploads/papers/math101_syllabus.pdf', NULL, NULL),
(36, '2024-06-05 11:30:00', 'PAPER', 19, NULL, '/uploads/papers/physics_lab_report.pdf', NULL, NULL),
(37, '2024-06-10 09:15:00', 'PAPER', 3, NULL, '/uploads/papers/history_essay.pdf', NULL, NULL),
(38, '2024-06-15 14:45:00', 'PAPER', 1, NULL, '/uploads/papers/chemistry_exam.pdf', NULL, NULL),
(39, '2024-06-20 16:20:00', 'PHOTO', 5, NULL, '/uploads/photos/graduation_ceremony.jpg', NULL, NULL),
(40, '2024-06-22 12:10:00', 'PHOTO', 4, NULL, '/uploads/photos/sports_day.jpg', NULL, NULL),
(41, '2024-06-25 08:30:00', 'PHOTO', 5, NULL, '/uploads/photos/library_event.png', NULL, NULL),
(42, '2024-06-28 17:45:00', 'PHOTO', 3, NULL, '/uploads/photos/research_conference.jpg', NULL, NULL),
(43, '2024-07-01 13:00:00', 'PHOTO', 1, NULL, '/uploads/photos/campus_aerial.jpg', NULL, NULL),
(44, '2024-07-03 09:30:00', 'PHOTO', 3, NULL, '/uploads/photos/student_art_show.jpg', NULL, NULL),
(201, '2026-03-04 09:18:39', 'PHOTO', 19, NULL, '\\Users\\Edupack 2021\\Documents\\A - ITQSHHB\\Library_LAS\\Samples\\Sample_Pictures\\CC54FD60-0066-4AC8-B0AA-1F8C256D247C_L0_001-12_02_2026, 15_36_47.jpg', NULL, NULL),
(202, '2026-03-04 09:21:44', 'PHOTO', 1, NULL, '/Users/Edupack 2021/Documents/A - ITQSHHB/Library_LAS/Samples/Sample_Pictures/WhatsApp Image 2025-04-17 at 20.22.52_de911aa6.jpg', NULL, NULL),
(203, '2026-03-26 14:07:39', 'PAPER', 1, NULL, '/uploads/papers/1774505259_e047d720.pdf', NULL, NULL),
(204, '2026-03-26 14:07:39', 'PHOTO', 1, NULL, '/uploads/photos/1774505259_98949f3b.jpg', NULL, NULL),
(205, '2026-03-26 14:07:39', 'PAPER', 1, NULL, '/uploads/papers/1774505259_faf0eb13.pdf', NULL, NULL),
(208, '2026-04-04 10:36:35', 'PAPER', 1, NULL, '/uploads/papers/1775270195_ae79fe65.pdf', NULL, NULL),
(209, '2026-04-04 10:36:35', 'PHOTO', 1, NULL, '/uploads/photos/1775270195_0a8047d3.jpg', NULL, NULL),
(210, '2026-04-04 10:42:23', 'PAPER', 1, NULL, '/uploads/papers/1775270543_a44a2ea7.pdf', NULL, NULL),
(211, '2026-04-04 10:42:23', 'PHOTO', 1, NULL, '/uploads/photos/1775270543_e9a92952.jpg', NULL, NULL),
(212, '2026-04-06 10:50:06', 'PAPER', 1, NULL, '/uploads/papers/1775443806_69aaade4.pdf', NULL, NULL),
(213, '2026-04-06 10:50:06', 'PHOTO', 1, NULL, '/uploads/photos/1775443806_dbc18790.jpg', NULL, NULL),
(214, '2026-04-06 10:50:10', 'PAPER', 1, NULL, '/uploads/papers/1775443810_8a255c46.pdf', NULL, NULL),
(215, '2026-04-06 10:50:10', 'PHOTO', 1, NULL, '/uploads/photos/1775443810_586c24d3.jpg', NULL, NULL),
(216, '2026-04-06 10:50:35', 'PAPER', 1, NULL, '/uploads/papers/1775443835_f60fe494.pdf', NULL, NULL),
(217, '2026-04-06 10:50:35', 'PHOTO', 1, NULL, '/uploads/photos/1775443835_46e3c819.jpg', NULL, NULL),
(218, '2026-04-06 11:00:13', 'PAPER', 1, NULL, '/uploads/papers/1775444413_7ad0292f.pdf', NULL, NULL),
(219, '2026-04-06 11:00:13', 'PHOTO', 1, NULL, '/uploads/photos/1775444413_6100ea61.jpg', NULL, NULL),
(220, '2026-04-06 11:09:11', 'PAPER', 1, NULL, '/uploads/papers/1775444951_05baa256.pdf', NULL, NULL),
(221, '2026-04-06 11:09:11', 'PHOTO', 1, NULL, '/uploads/photos/1775444951_753f1916.jpg', NULL, NULL),
(222, '2026-04-06 11:12:41', 'PAPER', 1, NULL, '/uploads/papers/1775445161_be20b961.pdf', NULL, NULL),
(223, '2026-04-06 11:12:41', 'PHOTO', 1, NULL, '/uploads/photos/1775445161_a8105a56.jpg', NULL, NULL),
(224, '2026-04-06 11:18:06', 'PAPER', 1, NULL, '/uploads/papers/1775445486_8fd75162.pdf', NULL, NULL),
(225, '2026-04-06 11:18:06', 'PHOTO', 1, NULL, '/uploads/photos/1775445486_8f06dc5c.jpg', NULL, NULL),
(226, '2026-04-06 11:19:50', 'PAPER', 1, NULL, '/uploads/papers/1775445590_d3325376.pdf', NULL, NULL),
(227, '2026-04-06 11:19:50', 'PHOTO', 1, NULL, '/uploads/photos/1775445590_13527ffe.jpg', NULL, NULL),
(228, '2026-04-06 11:20:01', 'PAPER', 1, NULL, '/uploads/papers/1775445601_538570dc.pdf', NULL, NULL),
(229, '2026-04-06 11:20:01', 'PHOTO', 1, NULL, '/uploads/photos/1775445601_2f737340.jpg', NULL, NULL),
(230, '2026-04-06 11:20:17', 'PAPER', 1, NULL, '/uploads/papers/1775445617_0b030dce.pdf', NULL, NULL),
(231, '2026-04-06 11:20:17', 'PHOTO', 1, NULL, '/uploads/photos/1775445617_eb3dc9ce.jpg', NULL, NULL),
(232, '2026-04-06 11:20:33', 'PAPER', 1, NULL, '/uploads/papers/1775445633_112372a0.pdf', NULL, NULL),
(233, '2026-04-06 11:20:33', 'PHOTO', 1, NULL, '/uploads/photos/1775445633_5107deaa.jpg', NULL, NULL),
(234, '2026-04-06 11:20:40', 'PAPER', 1, NULL, '/uploads/papers/1775445640_e5224a1a.pdf', NULL, NULL),
(235, '2026-04-06 11:20:40', 'PHOTO', 1, NULL, '/uploads/photos/1775445640_8f716694.jpg', NULL, NULL),
(236, '2026-04-06 11:32:03', 'PAPER', 1, NULL, '/uploads/papers/1775446323_b733058d.pdf', NULL, NULL),
(237, '2026-04-06 11:32:03', 'PHOTO', 1, NULL, '/uploads/photos/1775446323_c2d77870.jpg', NULL, NULL),
(238, '2026-04-06 11:36:25', 'PAPER', 1, '2026-04-06 03:36:25', '/uploads/papers/1775446585_d7f506da.pdf', NULL, NULL),
(239, '2026-04-06 11:36:25', 'PHOTO', 1, NULL, '/uploads/photos/1775446585_2acaf267.jpg', NULL, NULL),
(240, '2026-04-06 11:41:52', 'PAPER', 1, '2026-04-06 03:41:52', '/uploads/papers/1775446912_fe9cc664.pdf', NULL, NULL),
(241, '2026-04-06 11:41:52', 'PHOTO', 1, NULL, '/uploads/photos/1775446912_a8eec080.jpg', NULL, NULL),
(242, '2026-04-06 11:42:40', 'PAPER', 1, NULL, '/uploads/papers/1775446960_75a0a620.pdf', NULL, NULL),
(243, '2026-04-06 11:42:40', 'PHOTO', 1, NULL, '/uploads/photos/1775446960_1d16c69a.jpg', NULL, NULL),
(244, '2026-04-06 14:20:51', 'PAPER', 1, NULL, '/uploads/papers/1775456451_777f5ba4.pdf', NULL, NULL),
(245, '2026-04-06 14:20:51', 'PHOTO', 1, NULL, '/uploads/photos/1775456451_4c9ec92a.jpg', NULL, NULL),
(246, '2026-04-06 14:28:49', 'PAPER', 1, NULL, '/uploads/papers/1775456929_2d0af1a3.pdf', NULL, NULL),
(247, '2026-04-06 14:28:49', 'PHOTO', 1, NULL, '/uploads/photos/1775456929_f13ccf3f.jpg', NULL, NULL),
(248, '2026-04-07 09:34:54', 'PAPER', 1, NULL, '/uploads/papers/1775525694_f3027015.pdf', NULL, NULL),
(249, '2026-04-07 09:34:54', 'PHOTO', 1, NULL, '/uploads/photos/1775525694_9275768c.jpg', NULL, NULL),
(250, '2026-04-07 09:39:08', 'PAPER', 1, NULL, '/uploads/papers/1775525948_1f85a86b.pdf', NULL, 4),
(251, '2026-04-07 09:39:08', 'PHOTO', 1, '2026-04-30 15:03:23', '/uploads/photos/1775525948_cad6c206.jpg', NULL, NULL),
(252, '2026-05-02 09:46:21', 'PAPER', 1, NULL, '/uploads/papers/1777686381_8f4ec7c1.pdf', NULL, 2),
(253, '2026-05-02 10:57:21', 'PHOTO', 1, '2026-05-04 09:31:17', '/uploads/photos/1777690641_bf937826.jpg', NULL, 4),
(254, '2026-05-02 10:59:15', 'PHOTO', 1, NULL, '/uploads/photos/1777690755_3de42fdc.png', NULL, 4),
(255, '2026-05-02 10:59:15', 'PHOTO', 1, NULL, '/uploads/photos/1777690755_e308c319.jpg', NULL, 4),
(256, '2026-05-02 10:59:15', 'PHOTO', 1, NULL, '/uploads/photos/1777690755_9e7c03ad.png', NULL, 4),
(257, '2026-05-02 11:20:20', 'PAPER', 1, '2026-05-04 09:45:24', '/uploads/papers/1777692020_cf044f43.pdf', NULL, NULL),
(258, '2026-05-02 11:20:20', 'PAPER', 1, '2026-05-04 09:45:28', '/uploads/papers/1777692020_2dd8feb1.pdf', NULL, NULL),
(259, '2026-05-02 11:20:20', 'PAPER', 1, NULL, '/uploads/papers/1777692020_4714a0c1.pdf', NULL, NULL),
(260, '2026-05-02 11:20:20', 'PAPER', 1, NULL, '/uploads/papers/1777692020_5981afac.pdf', NULL, NULL),
(261, '2026-05-02 11:20:20', 'PAPER', 1, NULL, '/uploads/papers/1777692020_c702880f.pdf', NULL, NULL),
(262, '2026-05-04 17:49:17', 'PAPER', 1, NULL, '/uploads/papers/1777888157_557feb4d.pdf', NULL, NULL),
(263, '2026-05-04 17:49:17', 'PAPER', 1, NULL, '/uploads/papers/1777888157_ca7c432a.pdf', NULL, NULL),
(264, '2026-05-04 17:49:17', 'PAPER', 1, NULL, '/uploads/papers/1777888157_e85a7a3f.pdf', NULL, NULL),
(265, '2026-05-04 17:49:17', 'PAPER', 1, NULL, '/uploads/papers/1777888157_3b40c622.png', NULL, NULL),
(266, '2026-05-04 17:49:17', 'PAPER', 1, NULL, '/uploads/papers/1777888157_5a48d233.png', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `emailverifications`
--

CREATE TABLE `emailverifications` (
  `VerifyID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `Token` varchar(64) NOT NULL,
  `ExpiresAt` datetime NOT NULL,
  `UsedAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `filecategory`
--

CREATE TABLE `filecategory` (
  `CategoryID` int(11) NOT NULL,
  `CategoryName` varchar(100) NOT NULL,
  `CategoryNameBM` varchar(100) DEFAULT NULL,
  `ParentCategoryID` int(11) DEFAULT NULL,
  `Description` text DEFAULT NULL,
  `DescBM` text DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `filecategory`
--

INSERT INTO `filecategory` (`CategoryID`, `CategoryName`, `CategoryNameBM`, `ParentCategoryID`, `Description`, `DescBM`, `CreatedAt`) VALUES
(1, 'Papers', 'Kertas', NULL, 'Academic papers and exam materials', 'Bahan kertas akademik dan ujian', '2026-04-24 07:47:33'),
(2, 'Pictures', 'Gambar', NULL, 'Event photographs', 'Foto peristiwa', '2026-04-24 07:47:33'),
(3, 'O-Level', 'Tingkat O', 1, 'O-Level examination papers', 'Bahan ujian Tingkat O', '2026-04-24 07:47:33'),
(4, 'SPUB', 'SPUB', 1, 'SPUB examination papers', 'Bahan ujian SPUB', '2026-04-24 07:47:33'),
(5, 'Aliyah Qiraat', 'Aliyah Qiraat', 1, 'Diploma examination papers', 'Bahan ujian Diploma', '2026-04-24 07:47:33'),
(6, 'Graduation', 'Graduation', 2, 'Graduation photographs', 'Foto graduasi', '2026-04-24 07:47:33'),
(7, 'Student Intake Ceremony', 'Sambutan Penerimaan Pelajar', 2, 'Student intake photographs', 'Foto penerimaan pelajar', '2026-04-24 07:47:33');

-- --------------------------------------------------------

--
-- Table structure for table `filetags`
--

CREATE TABLE `filetags` (
  `FileID` int(11) NOT NULL,
  `TagID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `filetags`
--

INSERT INTO `filetags` (`FileID`, `TagID`) VALUES
(11, 1),
(11, 2),
(11, 14),
(22, 4),
(22, 5),
(22, 15),
(23, 8),
(35, 6),
(35, 14),
(39, 9),
(39, 12),
(40, 10),
(41, 9),
(42, 11),
(43, 11),
(44, 12),
(44, 13);

-- --------------------------------------------------------

--
-- Table structure for table `folders`
--

CREATE TABLE `folders` (
  `folderID` int(11) NOT NULL,
  `folderName` varchar(100) NOT NULL,
  `pathIDString` varchar(255) NOT NULL,
  `parentID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `folders`
--

INSERT INTO `folders` (`folderID`, `folderName`, `pathIDString`, `parentID`) VALUES
(1, 'Example Folder 1', '1/', NULL),
(2, 'example folder 2', '5/2/', 5),
(4, 'sub folder 2', '1/4/', 1),
(5, 'Papers', '5/', NULL),
(8, 'Photographs', '8/', NULL),
(9, 'Inauguration', '8/9/', 8);

-- --------------------------------------------------------

--
-- Table structure for table `papermetadata`
--

CREATE TABLE `papermetadata` (
  `FileID` int(11) NOT NULL,
  `PaperID` int(11) NOT NULL,
  `Subject` varchar(255) DEFAULT NULL,
  `MonthYear` date DEFAULT NULL,
  `Season` varchar(50) DEFAULT NULL,
  `Semester` varchar(50) DEFAULT NULL,
  `Code` varchar(50) DEFAULT NULL,
  `ScanOrDigital` enum('Scanned','Digital') DEFAULT NULL,
  `fileName` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `papermetadata`
--

INSERT INTO `papermetadata` (`FileID`, `PaperID`, `Subject`, `MonthYear`, `Season`, `Semester`, `Code`, `ScanOrDigital`, `fileName`) VALUES
(11, 5, 'Mathematics', '2024-01-01', 'Spring', 'Semester 1', 'MATH101', 'Digital', NULL),
(22, 6, 'Physics', '2024-01-01', 'Spring', 'Semester 1', 'PHYS201', 'Scanned', NULL),
(23, 7, 'History', '2023-12-01', 'Fall', 'Semester 2', 'HIST150', 'Digital', NULL),
(35, 8, 'Racism', '2024-05-01', 'Spring', 'Semester 2', 'CHEM210', 'Scanned', NULL),
(36, 9, 'Economics', '2024-05-01', 'Spring', 'Semester 2', 'CHEM210', 'Scanned', NULL),
(37, 10, 'Regenometry', '2024-05-01', 'Spring', 'Semester 2', 'CHEM210', 'Scanned', NULL),
(38, 11, 'PPhlebotomy', '2024-05-01', 'Spring', 'Semester 2', 'CHEM210', 'Scanned', NULL),
(203, 12, 'Fiqh', '2024-06-01', 'June', 'Semester 2', 'FQ201', 'Digital', NULL),
(205, 13, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(208, 14, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(210, 15, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(212, 16, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(214, 17, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(216, 18, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(218, 19, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(220, 20, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(222, 21, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(224, 22, 'TestSubject', NULL, 'June', 'Semester 1', 'TS101', 'Digital', NULL),
(226, 23, 'TestSubject', NULL, 'June', 'Semester 1', 'TS101', 'Digital', NULL),
(228, 24, 'TestSubject', NULL, 'June', 'Semester 1', 'TS101', 'Digital', NULL),
(230, 25, 'TestSubject', NULL, 'June', 'Semester 1', 'TS101', 'Digital', NULL),
(232, 26, 'TestSubject', NULL, 'June', 'Semester 1', 'TS101', 'Digital', NULL),
(234, 27, 'TestSubject', NULL, 'June', 'Semester 1', 'TS101', 'Digital', NULL),
(236, 28, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(238, 29, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(240, 30, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(242, 31, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(244, 32, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(246, 33, 'UpdatedSubject', NULL, 'December', 'Semester 1', 'TS202', 'Digital', NULL),
(248, 34, 'maths', NULL, NULL, NULL, NULL, NULL, NULL),
(250, 35, 'Maths 2', '0000-00-00', NULL, '2', '2210', 'Scanned', 'Maths'),
(252, 36, 'Maths example', '0000-00-00', 'June', '1', '2210', 'Digital', '2210_w25_ms_23.pdf'),
(257, 37, NULL, '0000-00-00', 'June', NULL, '2210', 'Scanned', '2210_w25_ms_23.pdf'),
(258, 38, NULL, '0000-00-00', 'June', NULL, '2210', 'Scanned', '2210_w25_qp_12.pdf'),
(259, 39, NULL, '0000-00-00', 'June', NULL, '2210', 'Scanned', '2210_w25_qp_13.pdf'),
(260, 40, NULL, '0000-00-00', 'June', NULL, '2210', 'Scanned', '2210_w25_qp_22.pdf'),
(261, 41, NULL, '0000-00-00', 'June', NULL, '2210', 'Scanned', '2210_w25_qp_23.pdf'),
(262, 42, NULL, NULL, NULL, NULL, NULL, NULL, '1777692020_cf044f43.pdf'),
(263, 43, NULL, NULL, NULL, NULL, NULL, NULL, 'las_db_2.pdf'),
(264, 44, NULL, NULL, NULL, NULL, NULL, NULL, 'LAS final report draft 1.pdf'),
(265, 45, NULL, NULL, NULL, NULL, NULL, NULL, 'Gemini_Generated_Image_d68z4wd68z4wd68z(1).png'),
(266, 46, NULL, NULL, NULL, NULL, NULL, NULL, 'Gemini_Generated_Image_d68z4wd68z4wd68z.png');

-- --------------------------------------------------------

--
-- Table structure for table `passresets`
--

CREATE TABLE `passresets` (
  `ResetID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `Token` varchar(64) NOT NULL,
  `ExpiresAt` datetime NOT NULL,
  `UsedAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `photometadata`
--

CREATE TABLE `photometadata` (
  `FileID` int(11) NOT NULL,
  `PhotoID` int(11) NOT NULL,
  `DataJSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`DataJSON`)),
  `Quality` varchar(50) DEFAULT NULL,
  `PictureDate` datetime DEFAULT NULL,
  `Event` varchar(255) DEFAULT NULL,
  `Photographer` varchar(255) DEFAULT NULL,
  `fileName` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `photometadata`
--

INSERT INTO `photometadata` (`FileID`, `PhotoID`, `DataJSON`, `Quality`, `PictureDate`, `Event`, `Photographer`, `fileName`) VALUES
(204, 204, '{\"lens\":\"50mm\",\"aperture\":\"f\\/1.8\",\"iso\":400}', 'High', '2025-03-20 10:30:00', 'Graduation Ceremony 2025', 'Ahmad', NULL),
(209, 209, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(211, 211, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(213, 213, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(215, 215, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(217, 217, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(219, 219, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(221, 221, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(223, 223, '{\"lens\":\"35mm\",\"iso\":800}', 'Low', '2025-01-01 00:00:00', 'Updated Event', 'TestPhotographer', NULL),
(225, 225, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(227, 227, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(229, 229, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(231, 231, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(233, 233, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(235, 235, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(237, 237, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(239, 239, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(241, 241, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(243, 243, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(245, 245, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(247, 247, NULL, 'High', '2025-01-01 00:00:00', 'Test Event 2025', 'TestPhotographer', NULL),
(249, 249, NULL, NULL, NULL, 'Cool paper', NULL, NULL),
(251, 251, NULL, NULL, NULL, 'Great Event 1', NULL, NULL),
(253, 253, NULL, NULL, NULL, 'example photo', 'Stocks', '360_F_56529105_3pSfbMGIKQsvdy8nAKTLr3ILq6Yxipnb.jpg'),
(254, 254, NULL, NULL, NULL, 'Example event 2', 'Amir', '1761-bu.png'),
(255, 255, NULL, NULL, NULL, 'Example event 2', 'Amir', 'fahim_pic.jpg'),
(256, 256, NULL, NULL, NULL, 'Example event 2', 'Amir', 'Figure_1.png'),
(39, 1005, '{\"camera\":\"Canon EOS\",\"resolution\":\"300dpi\"}', 'High', '2024-05-15 14:00:00', 'Graduation Ceremony', 'Jane Miller', NULL),
(40, 1006, '{\"camera\":\"Nikon D750\",\"resolution\":\"240dpi\"}', 'Medium', '2024-04-22 10:30:00', 'Sports Day', 'Mike Smith', NULL),
(41, 1007, '{\"camera\":\"iPhone 13\",\"resolution\":\"72dpi\"}', 'Medium', '2024-06-10 16:15:00', 'Library Event', 'Anna Lee', NULL),
(42, 1008, '{\"camera\":\"Sony A7III\",\"resolution\":\"300dpi\"}', 'High', '2024-05-28 09:45:00', 'Research Conference', 'David Chen', NULL),
(43, 1009, '{\"drone\":\"DJI Mavic\",\"resolution\":\"150dpi\"}', 'High', '2024-03-30 08:00:00', 'Campus Aerial', 'Chris Taylor', NULL),
(44, 1010, '{\"camera\":\"Fujifilm XT4\",\"resolution\":\"200dpi\"}', 'Medium', '2024-06-05 13:20:00', 'Student Art Show', 'Patricia Brown', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `RoleID` int(11) NOT NULL,
  `RoleName` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`RoleID`, `RoleName`) VALUES
(1, 'Admin'),
(2, 'User'),
(3, 'Staff');

-- --------------------------------------------------------

--
-- Table structure for table `staffprofile`
--

CREATE TABLE `staffprofile` (
  `UserID` int(11) NOT NULL,
  `Dept` varchar(100) NOT NULL,
  `StaffID` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staffprofile`
--

INSERT INTO `staffprofile` (`UserID`, `Dept`, `StaffID`) VALUES
(1, 'Library', 'G123'),
(3, 'Adminis', 'G246'),
(4, 'English', 'G223');

-- --------------------------------------------------------

--
-- Table structure for table `studentprofile`
--

CREATE TABLE `studentprofile` (
  `UserID` int(11) NOT NULL,
  `AcademicYear` int(11) NOT NULL,
  `StudentID` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `studentprofile`
--

INSERT INTO `studentprofile` (`UserID`, `AcademicYear`, `StudentID`) VALUES
(5, 2024, 'S100'),
(6, 2024, 'S101'),
(7, 2025, 'S102'),
(19, 2026, 'S103'),
(22, 1, 's2023');

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `TagID` int(11) NOT NULL,
  `TagContent` varchar(255) NOT NULL,
  `uploadTime` timestamp NOT NULL DEFAULT current_timestamp(),
  `Helpfulness` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tags`
--

INSERT INTO `tags` (`TagID`, `TagContent`, `uploadTime`, `Helpfulness`) VALUES
(1, 'math', '2026-02-25 05:14:19', 5),
(2, 'algebra', '2026-02-25 05:14:19', 2),
(3, 'calculus', '2026-02-25 05:14:19', 3),
(4, 'physics', '2026-02-25 05:14:19', 4),
(5, 'mechanics', '2026-02-25 05:14:19', 1),
(6, 'chemistry', '2026-02-25 05:14:19', 2),
(7, 'biology', '2026-02-25 05:14:19', 0),
(8, 'history', '2026-02-25 05:14:19', 3),
(9, 'graduation', '2026-02-25 05:14:19', 10),
(10, 'sports', '2026-02-25 05:14:19', 4),
(11, 'conference', '2026-02-25 05:14:19', 2),
(12, 'art', '2026-02-25 05:14:19', 1),
(13, 'campus', '2026-02-25 05:14:19', 0),
(14, 'exam', '2026-02-25 05:14:19', 6),
(15, 'lab report', '2026-02-25 05:14:19', 2),
(16, 'Tajweed', '2026-02-26 02:07:54', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tagvote`
--

CREATE TABLE `tagvote` (
  `TagID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `voteValue` tinyint(4) DEFAULT NULL CHECK (`voteValue` in (1,-1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tagvote`
--

INSERT INTO `tagvote` (`TagID`, `UserID`, `voteValue`) VALUES
(1, 1, 1),
(1, 3, 1),
(2, 19, -1),
(3, 4, 1),
(4, 5, 1),
(5, 1, -1),
(9, 3, 1),
(9, 19, 1),
(10, 4, -1),
(14, 5, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account`
--
ALTER TABLE `account`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `RoleID` (`RoleID`);

--
-- Indexes for table `activity`
--
ALTER TABLE `activity`
  ADD PRIMARY KEY (`LogID`),
  ADD KEY `UserID` (`UserID`);

--
-- Indexes for table `archive`
--
ALTER TABLE `archive`
  ADD PRIMARY KEY (`FileID`),
  ADD KEY `UploadedBy` (`UploadedBy`),
  ADD KEY `fk_archive_category` (`CategoryID`),
  ADD KEY `idx_folder` (`folderID`);

--
-- Indexes for table `emailverifications`
--
ALTER TABLE `emailverifications`
  ADD PRIMARY KEY (`VerifyID`),
  ADD UNIQUE KEY `Token` (`Token`),
  ADD KEY `UserID` (`UserID`);

--
-- Indexes for table `filecategory`
--
ALTER TABLE `filecategory`
  ADD PRIMARY KEY (`CategoryID`),
  ADD KEY `ParentCategoryID` (`ParentCategoryID`);

--
-- Indexes for table `filetags`
--
ALTER TABLE `filetags`
  ADD PRIMARY KEY (`FileID`,`TagID`),
  ADD KEY `TagID` (`TagID`);

--
-- Indexes for table `folders`
--
ALTER TABLE `folders`
  ADD PRIMARY KEY (`folderID`),
  ADD KEY `parentID` (`parentID`),
  ADD KEY `idx_path` (`pathIDString`);

--
-- Indexes for table `papermetadata`
--
ALTER TABLE `papermetadata`
  ADD PRIMARY KEY (`PaperID`),
  ADD KEY `FileID` (`FileID`);

--
-- Indexes for table `passresets`
--
ALTER TABLE `passresets`
  ADD PRIMARY KEY (`ResetID`),
  ADD UNIQUE KEY `Token` (`Token`),
  ADD KEY `UserID` (`UserID`);

--
-- Indexes for table `photometadata`
--
ALTER TABLE `photometadata`
  ADD PRIMARY KEY (`PhotoID`),
  ADD KEY `FileID` (`FileID`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`RoleID`);

--
-- Indexes for table `staffprofile`
--
ALTER TABLE `staffprofile`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `StaffID` (`StaffID`);

--
-- Indexes for table `studentprofile`
--
ALTER TABLE `studentprofile`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `StudentID` (`StudentID`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`TagID`),
  ADD UNIQUE KEY `TagContent` (`TagContent`);

--
-- Indexes for table `tagvote`
--
ALTER TABLE `tagvote`
  ADD PRIMARY KEY (`TagID`,`UserID`),
  ADD KEY `UserID` (`UserID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account`
--
ALTER TABLE `account`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `activity`
--
ALTER TABLE `activity`
  MODIFY `LogID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `archive`
--
ALTER TABLE `archive`
  MODIFY `FileID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=267;

--
-- AUTO_INCREMENT for table `emailverifications`
--
ALTER TABLE `emailverifications`
  MODIFY `VerifyID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `filecategory`
--
ALTER TABLE `filecategory`
  MODIFY `CategoryID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `folders`
--
ALTER TABLE `folders`
  MODIFY `folderID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `papermetadata`
--
ALTER TABLE `papermetadata`
  MODIFY `PaperID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `passresets`
--
ALTER TABLE `passresets`
  MODIFY `ResetID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `RoleID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tags`
--
ALTER TABLE `tags`
  MODIFY `TagID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account`
--
ALTER TABLE `account`
  ADD CONSTRAINT `account_ibfk_1` FOREIGN KEY (`RoleID`) REFERENCES `role` (`RoleID`) ON UPDATE CASCADE;

--
-- Constraints for table `activity`
--
ALTER TABLE `activity`
  ADD CONSTRAINT `activity_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `account` (`UserID`);

--
-- Constraints for table `archive`
--
ALTER TABLE `archive`
  ADD CONSTRAINT `archive_ibfk_1` FOREIGN KEY (`UploadedBy`) REFERENCES `account` (`UserID`),
  ADD CONSTRAINT `fk_archive_category` FOREIGN KEY (`CategoryID`) REFERENCES `filecategory` (`CategoryID`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_archive_folder` FOREIGN KEY (`folderID`) REFERENCES `folders` (`folderID`);

--
-- Constraints for table `emailverifications`
--
ALTER TABLE `emailverifications`
  ADD CONSTRAINT `emailverifications_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `account` (`UserID`);

--
-- Constraints for table `filecategory`
--
ALTER TABLE `filecategory`
  ADD CONSTRAINT `filecategory_ibfk_1` FOREIGN KEY (`ParentCategoryID`) REFERENCES `filecategory` (`CategoryID`) ON DELETE SET NULL;

--
-- Constraints for table `filetags`
--
ALTER TABLE `filetags`
  ADD CONSTRAINT `filetags_ibfk_1` FOREIGN KEY (`TagID`) REFERENCES `tags` (`TagID`),
  ADD CONSTRAINT `filetags_ibfk_2` FOREIGN KEY (`FileID`) REFERENCES `archive` (`FileID`);

--
-- Constraints for table `folders`
--
ALTER TABLE `folders`
  ADD CONSTRAINT `folders_ibfk_1` FOREIGN KEY (`parentID`) REFERENCES `folders` (`folderID`);

--
-- Constraints for table `papermetadata`
--
ALTER TABLE `papermetadata`
  ADD CONSTRAINT `papermetadata_ibfk_1` FOREIGN KEY (`FileID`) REFERENCES `archive` (`FileID`);

--
-- Constraints for table `passresets`
--
ALTER TABLE `passresets`
  ADD CONSTRAINT `passresets_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `account` (`UserID`);

--
-- Constraints for table `photometadata`
--
ALTER TABLE `photometadata`
  ADD CONSTRAINT `photometadata_ibfk_1` FOREIGN KEY (`FileID`) REFERENCES `archive` (`FileID`);

--
-- Constraints for table `staffprofile`
--
ALTER TABLE `staffprofile`
  ADD CONSTRAINT `fk_staff_account` FOREIGN KEY (`UserID`) REFERENCES `account` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `studentprofile`
--
ALTER TABLE `studentprofile`
  ADD CONSTRAINT `fk_student_account` FOREIGN KEY (`UserID`) REFERENCES `account` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `tagvote`
--
ALTER TABLE `tagvote`
  ADD CONSTRAINT `tagvote_ibfk_1` FOREIGN KEY (`TagID`) REFERENCES `tags` (`TagID`),
  ADD CONSTRAINT `tagvote_ibfk_2` FOREIGN KEY (`UserID`) REFERENCES `account` (`UserID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
