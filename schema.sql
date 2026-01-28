-- Create database pawfectcare
CREATE DATABASE pawfectcare;

-- use database pawfectcare
USE pawfectcare;

-- show databases
SHOW DATABASES;

-- create table owners
CREATE TABLE owners (
-- <column name> <data type> <options>
    ownerId INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20)
) engine = innodb;

-- create table pets
CREATE TABLE pets(
-- <column name> <data type> <options>
    petId INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    petName VARCHAR(50),
    species VARCHAR(30),
    dateOfBirth DATE
) engine = innodb;

-- create table bookings
CREATE TABLE bookings (
-- <column name> <data type> <options>
    bookingId INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    bookingDate DATE,
    startTime TIME,
    endTime TIME,
    durationMinutes TINYINT UNSIGNED,
    description TEXT
) engine = innodb;

-- create table services
CREATE TABLE services (
-- <column name> <data type> <options>
    serviceId INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    serviceName VARCHAR(80),
    serviceType VARCHAR(30),
    price DECIMAL,
    durationMinutes TINYINT UNSIGNED,
    description TEXT        
) engine = innodb;

-- to show tables 
SHOW TABLES;

-- ALTER TABLE BOOKINGS TO REMOVE WRONGLY CREATED COLUMNS
ALTER TABLE bookings
DROP COLUMN durationMinutes,
DROP COLUMN description;

-- to describe table details 
DESCRIBE bookings;

-- assign Foreign Keys to tables
-- set owner.ownerId as foreign key in pets Table
ALTER TABLE pets
ADD COLUMN ownerId INT UNSIGNED;

ALTER TABLE pets 
ADD CONSTRAINT fk_pets_owner
FOREIGN KEY (ownerId)
REFERENCES owners(ownerId)
ON UPDATE CASCADE
ON DELETE RESTRICT;

-- set owner.ownerId, pets.petId as foreign keys in bookings Table
ALTER TABLE bookings
ADD COLUMN ownerId INT UNSIGNED,
ADD COLUMN petId INT UNSIGNED;

ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_owners
FOREIGN KEY (ownerId)
REFERENCES owners(ownerId)
ON UPDATE CASCADE
ON DELETE RESTRICT;

ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_pets
FOREIGN KEY (petId)
REFERENCES pets(petId)
ON UPDATE CASCADE
ON DELETE RESTRICT;

-- to modify columns data type options to Not Null for the below 
ALTER TABLE owners
MODIFY firstName VARCHAR(255) NOT NULL,
MODIFY lastName VARCHAR(255) NOT NULL,
MODIFY email VARCHAR(100) NOT NULL,
MODIFY phone VARCHAR(20) NOT NULL;

ALTER TABLE pets
MODIFY petName VARCHAR(50) NOT NULL,
MODIFY species VARCHAR(30) NOT NULL,
MODIFY ownerId INT UNSIGNED NOT NULL;

ALTER TABLE services
MODIFY serviceName VARCHAR(80) NOT NULL,
MODIFY serviceType VARCHAR(30) NOT NULL,
MODIFY price DECIMAL(10,2) NOT NULL,
MODIFY durationMinutes TINYINT UNSIGNED NOT NULL;

ALTER TABLE bookings
MODIFY bookingDate DATE NOT NULL,
MODIFY startTime TIME NOT NULL,
MODIFY endTime TIME NOT NULL,
ADD COLUMN status VARCHAR(20) NOT NULL,
MODIFY ownerId INT UNSIGNED NOT NULL,
MODIFY petID INT UNSIGNED NOT NULL;

-- to change petID in bookings to petId when there is foreign key
ALTER TABLE bookings
DROP FOREIGN KEY fk_bookings_pets,
CHANGE COLUMN petID petId INT UNSIGNED NOT NULL,
ADD CONSTRAINT fk_bookings_pets
FOREIGN KEY (petId)
REFERENCES pets(petId)
ON UPDATE CASCADE
ON DELETE RESTRICT;

-- 
-- insert sample data to tables - 1 record each
INSERT INTO owners (firstName, lastName, email, phone) VALUES ("Anitha", "Gayathri", "anitha@123.com", "12345678");
INSERT INTO pets(petName, species, dateOfBirth, ownerId) VALUES ("Benny", "Dog", "2015-01-01", 1);
INSERT INTO services(serviceName, serviceType, price, durationMinutes, description) VALUES ("Basic Grooming","Grooming",100.00, 60, "Bathing, brushing, and nail trimming");
INSERT INTO bookings(bookingDate, startTime, endTime, ownerId, petId, status) VALUES ('2026-02-10', '10:00:00', '11:00:00', 1, 1, 'Pending');

-- insert sample date to tables - 4 records each at the same time 
INSERT INTO owners (firstName, lastName, email, phone) VALUES
('Ravi', 'Kumar', 'ravi.kumar@email.com', '91234567'),
('Mei', 'Ling', 'meiling@email.com', '81234567'),
('Daniel', 'Tan', 'daniel.tan@email.com', '98765432'),
('Siti', 'Aminah', 'siti.aminah@email.com', '93456789');

INSERT INTO pets (petName, species, dateOfBirth, ownerId) VALUES
('Max', 'Dog', '2018-06-15', 2),
('Luna', 'Cat', '2020-03-10', 3),
('Charlie', 'Dog', '2017-11-25', 4),
('Milo', 'Cat', '2019-08-05', 5);

INSERT INTO services (serviceName, serviceType, price, durationMinutes, description) VALUES
('Full Grooming', 'Grooming', 150.00, 90, 'Full grooming including haircut and ear cleaning'),
('Pet Walking 30 Min', 'Walking', 25.00, 30, '30-minute outdoor walking session'),
('Pet Boarding (Day)', 'Boarding', 60.00, 240, 'Daytime boarding with feeding and supervision'),
('Basic Training', 'Training', 120.00, 60, 'Basic obedience training session');

INSERT INTO bookings (bookingDate, startTime, endTime, ownerId, petId, status) VALUES
('2026-02-11', '09:00:00', '10:30:00', 2, 2, 'Confirmed'),
('2026-02-12', '14:00:00', '15:00:00', 3, 3, 'Pending'),
('2026-02-13', '16:00:00', '17:00:00', 4, 4, 'Completed'),
('2026-02-14', '11:00:00', '12:00:00', 5, 5, 'Confirmed');

INSERT INTO bookingServices (bookingId, serviceId) VALUES
(1,1),
(2,6),
(3,7),
(4,8),
(5,9);

-- change datatype of services.durationMinutes to smallINT unsigned from tintINT unsigned
ALTER TABLE services
MODIFY durationMinutes SMALLINT UNSIGNED NOT NULL;

-- checking update of small int in services 
SELECT serviceId, serviceName, durationMinutes
FROM services
ORDER BY serviceId DESC
LIMIT 1;

-- create Join Table - bookingServices
CREATE TABLE bookingServices (
  bookingServiceId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bookingId INT UNSIGNED NOT NULL,
  serviceId INT UNSIGNED NOT NULL,
  CONSTRAINT fk_bookingServices_bookings
    FOREIGN KEY (bookingId)
    REFERENCES bookings(bookingId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_bookingServices_service
    FOREIGN KEY (serviceId)
    REFERENCES services(serviceId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- to view meaningful columns in Bookings Table
SELECT 
        b.bookingId,
        b.bookingDate,
        b.startTime,
        b.endTime,
        b.status,

        s.serviceName AS serviceName,

        o.firstName AS ownerFirstName,
        o.lastName AS ownerlastName,
        o.email AS ownerEmail,
        o.phone AS ownerPhone,

        p.petName AS petName,
        p.species AS species

      FROM bookings b
      JOIN owners o ON b.ownerId = o.ownerId
      JOIN pets p ON b.petId = p.petId
      LEFT JOIN bookingServices bs ON b.bookingId = bs.bookingId
      LEFT JOIN services s ON bs.serviceId = s.serviceId

      ORDER BY b.bookingId DESC;
    
-- ADD UNIQUE IDS FOR owners (email and phone) and pets(owner_petName) 
-- to avoid duplicates in email, phone and pets

ALTER TABLE owners
ADD UNIQUE KEY uq_owners_email (email),
ADD UNIQUE KEY uq_owners_phone (phone);

ALTER TABLE pets
ADD UNIQUE KEY uq_pets_owners_petname (ownerId, petName);
