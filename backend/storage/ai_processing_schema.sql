-- AI Processing Schema Migration
-- Run after initial LAS schema is set up

ALTER TABLE Tags
ADD COLUMN Source ENUM('user', 'local_ai', 'cloud_vlm') DEFAULT 'user',
ADD COLUMN ConfidenceScore DECIMAL(3, 2) DEFAULT 1.00;

CREATE TABLE FileAIContent (
    FileID INT PRIMARY KEY,
    OCRText LONGTEXT,
    Summary TEXT,
    LaTeXContent TEXT,
    ProcessingMethod ENUM('local', 'cloud'),
    FOREIGN KEY (FileID) REFERENCES archive (FileID) ON DELETE CASCADE,
    FULLTEXT(OCRText)
) ENGINE=InnoDB;

CREATE TABLE ProcessingQueue (
    QueueID INT AUTO_INCREMENT PRIMARY KEY,
    FileID INT NOT NULL,
    Status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    TargetMethod ENUM('local', 'cloud') DEFAULT 'local',
    ErrorMessage TEXT,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (FileID) REFERENCES archive(FileID) ON DELETE CASCADE
);

-- Stores the top place classification result for PHOTO files.
-- PlaceKey  = sanitised machine key  e.g. "science_lab"
-- PlaceLabel = display name          e.g. "Science Lab"
-- Populated by DBpoller from Room_label:* tags via CLIP prototype matching.
CREATE TABLE FilePlaces (
    FileID     INT          NOT NULL,
    PlaceKey   VARCHAR(100) NOT NULL,
    PlaceLabel VARCHAR(100) NOT NULL,
    Confidence DECIMAL(4,3) NOT NULL,
    PRIMARY KEY (FileID, PlaceKey),
    FOREIGN KEY (FileID) REFERENCES archive(FileID) ON DELETE CASCADE
);
