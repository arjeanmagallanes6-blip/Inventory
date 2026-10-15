-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 15, 2026 at 06:14 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `inventory_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `brand`
--

CREATE TABLE `brand` (
  `brand_id` int(11) NOT NULL,
  `brand_name` varchar(150) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `brand`
--

INSERT INTO `brand` (`brand_id`, `brand_name`, `is_deleted`) VALUES
(1, 'Orions', 0),
(2, 'Mongol', 0),
(3, 'Pilot', 0),
(4, 'Stabilo', 0),
(5, 'PaperOne', 0),
(6, 'Crayola', 0),
(7, 'Faber-Castell', 0),
(8, 'Elmer\'s', 0),
(9, 'Advance', 0);

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `category`
--

INSERT INTO `category` (`category_id`, `category_name`, `description`, `is_deleted`) VALUES
(1, 'Papers Products', 'Copier bond paper, construction paper, graphing paper, folder boards', 0),
(2, 'Notebooks & Pads', 'Spiral notebooks, composition books, intermediate/grade pads', 0),
(3, 'Writing Instruments', 'Pencils, gel pens, ballpens, highlighters, markers, technical pens', 0),
(4, 'Art & Craft Supplies', 'Crayons, paints, brushes, modeling clay, colored pencils, sketchpads', 0),
(5, 'Dairy Products', 'N/A', 0),
(6, 'Filing & Storage', 'Plastic envelopes, expanders, ring binders, clearbooks.', 0),
(7, 'Correction & Desk Accessories', 'Erasers, correction tape, pencil sharpeners, paper clips, staplers.', 0),
(8, 'Adhesives & Tapes', 'Liquid glue, glue sticks, masking tape, double-sided tape, clear tape', 0);

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `item_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unit_id` int(11) NOT NULL,
  `minimum_stock` int(11) NOT NULL DEFAULT 0,
  `maximum_stock` int(11) NOT NULL DEFAULT 0,
  `reorder_level` int(11) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `shelf_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`item_id`, `category_id`, `brand_id`, `item_name`, `description`, `unit_price`, `selling_price`, `unit_id`, `minimum_stock`, `maximum_stock`, `reorder_level`, `is_deleted`, `shelf_id`) VALUES
(1, 1, 5, 'Intermediate Paper', 'N/A', 35.00, 24.00, 6, 100, 500, 0, 0, 1),
(2, 2, 9, 'Notebook', '', 28.00, 19.00, 4, 100, 500, 0, 0, 5),
(3, 3, 2, 'Mongol #2 Pencils', 'N/A', 85.00, 60.00, 3, 100, 500, 0, 0, 3),
(4, 3, 9, 'Sign Pen, Black', '', 110.00, 78.00, 1, 100, 500, 0, 0, 4),
(5, 4, 6, 'Crayola Crayons', '', 114.00, 82.00, 3, 100, 500, 0, 0, 4),
(6, 7, 8, 'Pencil Sharpener', '', 25.00, 16.00, 1, 100, 500, 0, 0, 5),
(7, 7, 7, 'Rubber Eraser', '', 20.00, 13.00, 1, 100, 500, 0, 0, 6);

-- --------------------------------------------------------

--
-- Table structure for table `item_supplier`
--

CREATE TABLE `item_supplier` (
  `item_supplier_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_supplier`
--

INSERT INTO `item_supplier` (`item_supplier_id`, `item_id`, `supplier_id`) VALUES
(1, 1, 2),
(2, 2, 2),
(3, 3, 3),
(4, 4, 3),
(5, 5, 4),
(6, 6, 3),
(7, 7, 5);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `purchase_order_id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `purchase_order_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `purchase_order_number` varchar(50) NOT NULL,
  `order_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`purchase_order_id`, `supplier_id`, `purchase_order_number`, `order_date`, `expected_delivery_date`) VALUES
(1, 2, 'PO-2026-4343', '2026-10-15', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_details`
--

CREATE TABLE `purchase_order_details` (
  `purchase_order_detail_id` int(11) NOT NULL,
  `purchase_order_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `total_cost` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_order_details`
--

INSERT INTO `purchase_order_details` (`purchase_order_detail_id`, `purchase_order_id`, `item_id`, `quantity`, `unit_cost`, `total_cost`) VALUES
(1, 1, 1, 3, 35.00, 105.00),
(2, 1, 2, 4, 28.00, 112.00);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_returns`
--

CREATE TABLE `purchase_returns` (
  `purchase_returns_id` int(11) NOT NULL,
  `stock_in_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `return_date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_return_details`
--

CREATE TABLE `purchase_return_details` (
  `p_return_details_id` int(11) NOT NULL,
  `purchase_return_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `returns`
--

CREATE TABLE `returns` (
  `return_id` int(11) NOT NULL,
  `stock_out_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `return_date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `return_details`
--

CREATE TABLE `return_details` (
  `return_details_id` int(11) NOT NULL,
  `return_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`role_id`, `role_name`, `is_deleted`) VALUES
(1, 'Admin', 0),
(2, 'Staff', 0);

-- --------------------------------------------------------

--
-- Table structure for table `shelf`
--

CREATE TABLE `shelf` (
  `shelf_id` int(11) NOT NULL,
  `shelf_code` varchar(50) NOT NULL,
  `shelf_name` varchar(150) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shelf`
--

INSERT INTO `shelf` (`shelf_id`, `shelf_code`, `shelf_name`, `is_deleted`) VALUES
(1, 'SH-A1', 'Rack - top level', 0),
(2, 'SH-B1', 'Rack B - Top Level', 0),
(3, 'SH-C1', 'Rack A - Top Level', 0),
(4, 'SH-D2', 'Rack C - Top Level', 0),
(5, 'SH-E3', 'Rack D - Middle Level', 0),
(6, 'SH-F1', 'Rack E - Bottom Level', 0);

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustment_dtl`
--

CREATE TABLE `stock_adjustment_dtl` (
  `adjustment_dtl_id` int(11) NOT NULL,
  `adjustment_hdr_id` int(11) NOT NULL,
  `quantity_before` int(11) NOT NULL,
  `quantity_adjusted` int(11) NOT NULL,
  `quantity_after` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustment_header`
--

CREATE TABLE `stock_adjustment_header` (
  `adjustment_header_id` int(11) NOT NULL,
  `adjustment_no` varchar(50) NOT NULL,
  `item_id` int(11) NOT NULL,
  `shelf_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `adjustment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `remarks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_in`
--

CREATE TABLE `stock_in` (
  `stock_in_id` int(11) NOT NULL,
  `purchase_order_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `stock_in_date` datetime NOT NULL DEFAULT current_timestamp(),
  `delivery_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_in`
--

INSERT INTO `stock_in` (`stock_in_id`, `purchase_order_id`, `supplier_id`, `user_id`, `stock_in_date`, `delivery_date`) VALUES
(1, 1, 2, 1, '2026-10-15 10:45:41', '2026-10-15');

-- --------------------------------------------------------

--
-- Table structure for table `stock_in_details`
--

CREATE TABLE `stock_in_details` (
  `stock_in_details_id` int(11) NOT NULL,
  `stock_in_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `batch_no` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_in_details`
--

INSERT INTO `stock_in_details` (`stock_in_details_id`, `stock_in_id`, `item_id`, `quantity`, `unit_cost`, `total_cost`, `batch_no`) VALUES
(1, 1, 1, 3, 35.00, 105.00, NULL),
(2, 1, 2, 4, 28.00, 112.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `stock_out`
--

CREATE TABLE `stock_out` (
  `stock_out_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `stock_out_date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_out`
--

INSERT INTO `stock_out` (`stock_out_id`, `user_id`, `stock_out_date`) VALUES
(1, 1, '2026-10-15 10:47:54');

-- --------------------------------------------------------

--
-- Table structure for table `stock_out_details`
--

CREATE TABLE `stock_out_details` (
  `stock_out_details_id` int(11) NOT NULL,
  `stock_out_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_out_details`
--

INSERT INTO `stock_out_details` (`stock_out_details_id`, `stock_out_id`, `item_id`, `quantity`) VALUES
(1, 1, 1, 3);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `supplier_name`, `contact_person`, `contact_number`, `email`, `address`, `is_deleted`) VALUES
(1, 'Goldwings Stationery Products, Inc.', 'Heather Heinz', '0975268465531', 'mekhyla@gmail.com', 'Zayas, Upper Carmen, CDO', 0),
(2, 'Star Paper Corporation', 'Maria Santos', '0975268465531', 'micahosic02@gmail.com', 'Manila', 0),
(3, 'Crown Supply & Trading Co.', 'Juan Dela Cruz', '+63 2 8234 5678', 'arjeanmagallanes@yahoo.com', '521 Juan Luna Street, Binondo, Manila, Metro Manila', 0),
(4, 'CraftWorld Philippines Inc.', 'Mark Tan', '+63 2 8456 7890', 'orate@gmail.com', 'Unit 302, Chino Roces Ave., Brgy. San Lorenzo, Makati City, Metro Manila', 0),
(5, 'Metro Office & School Distributors', 'Ana Reyes', '+63 2 8345 6789', 'jade@gmail.com', '88 Quezon Avenue, Brgy. West Triangle, Quezon City, Metro Manila', 0);

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `unit_id` int(11) NOT NULL,
  `unit_name` varchar(100) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`unit_id`, `unit_name`, `is_deleted`) VALUES
(1, 'PCS', 0),
(2, 'PAL', 0),
(3, 'CTN', 0),
(4, 'BDL', 0),
(5, 'REAM', 0),
(6, 'PAD', 0);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(150) NOT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `role_id`, `first_name`, `last_name`, `username`, `password`, `email`, `status`, `created_at`, `is_deleted`) VALUES
(1, 1, 'arjean', 'mags', 'arjean_1', '$2y$10$jl9fQldHJD/k8GNsR482iOa51K4FiHLooCI3WIVFTQoCtXkYvTLCW', 'arjeanmagallanes@yahoo.com', 'Active', '2026-10-15 09:23:56', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `brand`
--
ALTER TABLE `brand`
  ADD PRIMARY KEY (`brand_id`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `fk_items_category` (`category_id`),
  ADD KEY `fk_items_brand` (`brand_id`),
  ADD KEY `fk_items_unit` (`unit_id`),
  ADD KEY `fk_items_shelf` (`shelf_id`);

--
-- Indexes for table `item_supplier`
--
ALTER TABLE `item_supplier`
  ADD PRIMARY KEY (`item_supplier_id`),
  ADD UNIQUE KEY `uq_item_supplier` (`item_id`,`supplier_id`),
  ADD KEY `fk_isup_supplier` (`supplier_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `fk_pay_po` (`purchase_order_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`purchase_order_id`),
  ADD KEY `fk_po_supplier` (`supplier_id`);

--
-- Indexes for table `purchase_order_details`
--
ALTER TABLE `purchase_order_details`
  ADD PRIMARY KEY (`purchase_order_detail_id`),
  ADD KEY `fk_pod_po` (`purchase_order_id`),
  ADD KEY `fk_pod_item` (`item_id`);

--
-- Indexes for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  ADD PRIMARY KEY (`purchase_returns_id`),
  ADD KEY `fk_pr_stockin` (`stock_in_id`),
  ADD KEY `fk_pr_supplier` (`supplier_id`),
  ADD KEY `fk_pr_user` (`user_id`);

--
-- Indexes for table `purchase_return_details`
--
ALTER TABLE `purchase_return_details`
  ADD PRIMARY KEY (`p_return_details_id`),
  ADD KEY `fk_prd_return` (`purchase_return_id`),
  ADD KEY `fk_prd_item` (`item_id`);

--
-- Indexes for table `returns`
--
ALTER TABLE `returns`
  ADD PRIMARY KEY (`return_id`),
  ADD KEY `fk_ret_stockout` (`stock_out_id`),
  ADD KEY `fk_ret_user` (`user_id`);

--
-- Indexes for table `return_details`
--
ALTER TABLE `return_details`
  ADD PRIMARY KEY (`return_details_id`),
  ADD KEY `fk_rd_return` (`return_id`),
  ADD KEY `fk_rd_item` (`item_id`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `shelf`
--
ALTER TABLE `shelf`
  ADD PRIMARY KEY (`shelf_id`);

--
-- Indexes for table `stock_adjustment_dtl`
--
ALTER TABLE `stock_adjustment_dtl`
  ADD PRIMARY KEY (`adjustment_dtl_id`),
  ADD KEY `fk_sad_header` (`adjustment_hdr_id`);

--
-- Indexes for table `stock_adjustment_header`
--
ALTER TABLE `stock_adjustment_header`
  ADD PRIMARY KEY (`adjustment_header_id`),
  ADD KEY `fk_sah_item` (`item_id`),
  ADD KEY `fk_sah_shelf` (`shelf_id`),
  ADD KEY `fk_sah_user` (`user_id`);

--
-- Indexes for table `stock_in`
--
ALTER TABLE `stock_in`
  ADD PRIMARY KEY (`stock_in_id`),
  ADD KEY `fk_si_po` (`purchase_order_id`),
  ADD KEY `fk_si_supplier` (`supplier_id`),
  ADD KEY `fk_si_user` (`user_id`);

--
-- Indexes for table `stock_in_details`
--
ALTER TABLE `stock_in_details`
  ADD PRIMARY KEY (`stock_in_details_id`),
  ADD KEY `fk_sid_stockin` (`stock_in_id`),
  ADD KEY `fk_sid_item` (`item_id`);

--
-- Indexes for table `stock_out`
--
ALTER TABLE `stock_out`
  ADD PRIMARY KEY (`stock_out_id`),
  ADD KEY `fk_so_user` (`user_id`);

--
-- Indexes for table `stock_out_details`
--
ALTER TABLE `stock_out_details`
  ADD PRIMARY KEY (`stock_out_details_id`),
  ADD KEY `fk_sod_stockout` (`stock_out_id`),
  ADD KEY `fk_sod_item` (`item_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`unit_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `brand`
--
ALTER TABLE `brand`
  MODIFY `brand_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `item_supplier`
--
ALTER TABLE `item_supplier`
  MODIFY `item_supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `purchase_order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `purchase_order_details`
--
ALTER TABLE `purchase_order_details`
  MODIFY `purchase_order_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  MODIFY `purchase_returns_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_return_details`
--
ALTER TABLE `purchase_return_details`
  MODIFY `p_return_details_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `returns`
--
ALTER TABLE `returns`
  MODIFY `return_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `return_details`
--
ALTER TABLE `return_details`
  MODIFY `return_details_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `shelf`
--
ALTER TABLE `shelf`
  MODIFY `shelf_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `stock_adjustment_dtl`
--
ALTER TABLE `stock_adjustment_dtl`
  MODIFY `adjustment_dtl_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_adjustment_header`
--
ALTER TABLE `stock_adjustment_header`
  MODIFY `adjustment_header_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_in`
--
ALTER TABLE `stock_in`
  MODIFY `stock_in_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `stock_in_details`
--
ALTER TABLE `stock_in_details`
  MODIFY `stock_in_details_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `stock_out`
--
ALTER TABLE `stock_out`
  MODIFY `stock_out_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `stock_out_details`
--
ALTER TABLE `stock_out_details`
  MODIFY `stock_out_details_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `unit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `fk_items_brand` FOREIGN KEY (`brand_id`) REFERENCES `brand` (`brand_id`),
  ADD CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `fk_items_shelf` FOREIGN KEY (`shelf_id`) REFERENCES `shelf` (`shelf_id`),
  ADD CONSTRAINT `fk_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`);

--
-- Constraints for table `item_supplier`
--
ALTER TABLE `item_supplier`
  ADD CONSTRAINT `fk_isup_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_isup_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_pay_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`purchase_order_id`);

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`);

--
-- Constraints for table `purchase_order_details`
--
ALTER TABLE `purchase_order_details`
  ADD CONSTRAINT `fk_pod_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_pod_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`purchase_order_id`);

--
-- Constraints for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  ADD CONSTRAINT `fk_pr_stockin` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_in` (`stock_in_id`),
  ADD CONSTRAINT `fk_pr_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `purchase_return_details`
--
ALTER TABLE `purchase_return_details`
  ADD CONSTRAINT `fk_prd_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_prd_return` FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns` (`purchase_returns_id`);

--
-- Constraints for table `returns`
--
ALTER TABLE `returns`
  ADD CONSTRAINT `fk_ret_stockout` FOREIGN KEY (`stock_out_id`) REFERENCES `stock_out` (`stock_out_id`),
  ADD CONSTRAINT `fk_ret_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `return_details`
--
ALTER TABLE `return_details`
  ADD CONSTRAINT `fk_rd_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_rd_return` FOREIGN KEY (`return_id`) REFERENCES `returns` (`return_id`);

--
-- Constraints for table `stock_adjustment_dtl`
--
ALTER TABLE `stock_adjustment_dtl`
  ADD CONSTRAINT `fk_sad_header` FOREIGN KEY (`adjustment_hdr_id`) REFERENCES `stock_adjustment_header` (`adjustment_header_id`);

--
-- Constraints for table `stock_adjustment_header`
--
ALTER TABLE `stock_adjustment_header`
  ADD CONSTRAINT `fk_sah_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_sah_shelf` FOREIGN KEY (`shelf_id`) REFERENCES `shelf` (`shelf_id`),
  ADD CONSTRAINT `fk_sah_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_in`
--
ALTER TABLE `stock_in`
  ADD CONSTRAINT `fk_si_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`purchase_order_id`),
  ADD CONSTRAINT `fk_si_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `fk_si_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_in_details`
--
ALTER TABLE `stock_in_details`
  ADD CONSTRAINT `fk_sid_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_sid_stockin` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_in` (`stock_in_id`);

--
-- Constraints for table `stock_out`
--
ALTER TABLE `stock_out`
  ADD CONSTRAINT `fk_so_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_out_details`
--
ALTER TABLE `stock_out_details`
  ADD CONSTRAINT `fk_sod_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `fk_sod_stockout` FOREIGN KEY (`stock_out_id`) REFERENCES `stock_out` (`stock_out_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
