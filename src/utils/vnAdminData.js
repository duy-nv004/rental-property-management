/**
 * Bộ dữ liệu hành chính Việt Nam đầy đủ (63 Tỉnh/Thành phố, toàn bộ Quận/Huyện/Thị xã/TP
 * và danh mục Phường/Xã/Thị trấn theo từng Quận/Huyện) dùng cho bộ lọc tìm kiếm và form tòa nhà.
 */

export const PRIORITY_VN_CITIES = [
  'Hà Nội',
  'TP.HCM',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Bình Dương',
  'Đồng Nai',
];

export const VN_DISTRICTS_BY_CITY = {
  'Hà Nội': [
    'Ba Đình', 'Bắc Từ Liêm', 'Cầu Giấy', 'Đống Đa', 'Hà Đông', 'Hai Bà Trưng',
    'Hoàn Kiếm', 'Hoàng Mai', 'Long Biên', 'Nam Từ Liêm', 'Tây Hồ', 'Thanh Xuân',
    'Thị xã Sơn Tây', 'Ba Vì', 'Chương Mỹ', 'Đan Phượng', 'Đông Anh', 'Gia Lâm',
    'Hoài Đức', 'Mê Linh', 'Mỹ Đức', 'Phú Xuyên', 'Phúc Thọ', 'Quốc Oai',
    'Sóc Sơn', 'Thạch Thất', 'Thanh Oai', 'Thanh Trì', 'Thường Tín', 'Ứng Hòa',
  ],
  'TP.HCM': [
    'TP. Thủ Đức', 'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
    'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Tân', 'Bình Thạnh', 'Gò Vấp',
    'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Bình Chánh', 'Cần Giờ', 'Củ Chi', 'Hóc Môn', 'Nhà Bè',
  ],
  'Đà Nẵng': [
    'Cẩm Lệ', 'Hải Châu', 'Hòa Vang', 'Hoàng Sa', 'Liên Chiểu', 'Ngũ Hành Sơn', 'Sơn Trà', 'Thanh Khê',
  ],
  'Hải Phòng': [
    'Đồ Sơn', 'Dương Kinh', 'Hải An', 'Hồng Bàng', 'Kiến An', 'Lê Chân', 'Ngô Quyền',
    'An Dương', 'An Lão', 'Bạch Long Vĩ', 'Cát Hải', 'Kiến Thụy', 'Thủy Nguyên', 'Tiên Lãng', 'Vĩnh Bảo',
  ],
  'Cần Thơ': [
    'Bình Thủy', 'Cái Răng', 'Ninh Kiều', 'Ô Môn', 'Thốt Nốt', 'Cờ Đỏ', 'Phong Điền', 'Thới Lai', 'Vĩnh Thạnh',
  ],
  'Bình Dương': [
    'Thủ Dầu Một', 'Dĩ An', 'Thuận An', 'Tân Uyên', 'Bến Cát', 'Bắc Tân Uyên', 'Bàu Bàng', 'Dầu Tiếng', 'Phú Giáo',
  ],
  'Đồng Nai': [
    'Biên Hòa', 'Long Khánh', 'Cẩm Mỹ', 'Định Quán', 'Long Thành', 'Nhơn Trạch',
    'Tân Phú', 'Thống Nhất', 'Trảng Bom', 'Vĩnh Cửu', 'Xuân Lộc',
  ],
  'An Giang': [
    'TP. Long Xuyên', 'TP. Châu Đốc', 'Thị xã Tân Châu', 'Thị xã Tịnh Biên',
    'An Phú', 'Châu Phú', 'Châu Thành', 'Chợ Mới', 'Phú Tân', 'Thoại Sơn', 'Tri Tôn',
  ],
  'Bà Rịa - Vũng Tàu': [
    'TP. Vũng Tàu', 'TP. Bà Rịa', 'Thị xã Phú Mỹ', 'Châu Đức', 'Côn Đảo', 'Đất Đỏ', 'Long Điền', 'Xuyên Mộc',
  ],
  'Bắc Giang': [
    'TP. Bắc Giang', 'Thị xã Việt Yên', 'Thị xã Chũ', 'Hiệp Hòa', 'Lạng Giang',
    'Lục Nam', 'Lục Ngạn', 'Sơn Động', 'Tân Yên', 'Yên Thế',
  ],
  'Bắc Kạn': [
    'TP. Bắc Kạn', 'Ba Bể', 'Bạch Thông', 'Chợ Đồn', 'Chợ Mới', 'Na Rì', 'Ngân Sơn', 'Pác Nặm',
  ],
  'Bạc Liêu': [
    'TP. Bạc Liêu', 'Thị xã Giá Rai', 'Đông Hải', 'Hòa Bình', 'Hồng Dân', 'Phước Long', 'Vĩnh Lợi',
  ],
  'Bắc Ninh': [
    'TP. Bắc Ninh', 'Từ Sơn', 'Quế Võ', 'Thị xã Thuận Thành', 'Gia Bình', 'Lương Tài', 'Tiên Du', 'Yên Phong',
  ],
  'Bến Tre': [
    'TP. Bến Tre', 'Ba Tri', 'Bình Đại', 'Châu Thành', 'Chợ Lách', 'Giồng Trôm', 'Mỏ Cày Bắc', 'Mỏ Cày Nam', 'Thạnh Phú',
  ],
  'Bình Định': [
    'TP. Quy Nhơn', 'Thị xã An Nhơn', 'Thị xã Hoài Nhơn', 'An Lão', 'Hoài Ân',
    'Phù Cát', 'Phù Mỹ', 'Tây Sơn', 'Tuy Phước', 'Vân Canh', 'Vĩnh Thạnh',
  ],
  'Bình Phước': [
    'TP. Đồng Xoài', 'Thị xã Bình Long', 'Thị xã Chơn Thành', 'Thị xã Phước Long',
    'Bù Đăng', 'Bù Đốp', 'Bù Gia Mập', 'Đồng Phú', 'Hớn Quản', 'Lộc Ninh', 'Phú Riềng',
  ],
  'Bình Thuận': [
    'TP. Phan Thiết', 'Thị xã La Gi', 'Bắc Bình', 'Đức Linh', 'Hàm Tân',
    'Hàm Thuận Bắc', 'Hàm Thuận Nam', 'Phú Quý', 'Tánh Linh', 'Tuy Phong',
  ],
  'Cà Mau': [
    'TP. Cà Mau', 'Cái Nước', 'Đầm Dơi', 'Năm Căn', 'Ngọc Hiển', 'Phú Tân', 'Thới Bình', 'Trần Văn Thời', 'U Minh',
  ],
  'Cao Bằng': [
    'TP. Cao Bằng', 'Bảo Lạc', 'Bảo Lâm', 'Hạ Lang', 'Hà Quảng', 'Hòa An', 'Nguyên Bình', 'Quảng Hòa', 'Thạch An', 'Trùng Khánh',
  ],
  'Đắk Lắk': [
    'TP. Buôn Ma Thuột', 'Thị xã Buôn Hồ', 'Buôn Đôn', 'Cư Kuin', "Cư M'gar",
    "Ea H'leo", 'Ea Kar', 'Ea Súp', 'Krông Ana', 'Krông Bông', 'Krông Búk',
    'Krông Năng', 'Krông Pắc', 'Lắk', "M'Đrắk",
  ],
  'Đắk Nông': [
    'TP. Gia Nghĩa', 'Cư Jút', 'Đắk Glong', 'Đắk Mil', "Đắk R'lấp", 'Đắk Song', 'Krông Nô', 'Tuy Đức',
  ],
  'Điện Biên': [
    'TP. Điện Biên Phủ', 'Thị xã Mường Lay', 'Điện Biên', 'Điện Biên Đông',
    'Mường Ảng', 'Mường Chà', 'Mường Nhé', 'Nậm Pồ', 'Tủa Chùa', 'Tuần Giáo',
  ],
  'Đồng Tháp': [
    'TP. Cao Lãnh', 'TP. Sa Đéc', 'TP. Hồng Ngự', 'Huyện Cao Lãnh', 'Châu Thành',
    'Huyện Hồng Ngự', 'Lai Vung', 'Lấp Vò', 'Tam Nông', 'Tân Hồng', 'Thanh Bình', 'Tháp Mười',
  ],
  'Gia Lai': [
    'TP. Pleiku', 'Thị xã An Khê', 'Thị xã Ayun Pa', 'Chư Păh', 'Chư Prông', 'Chư Pưh',
    'Chư Sê', 'Đăk Đoa', 'Đăk Pơ', 'Đức Cơ', 'Ia Grai', 'Ia Pa', 'Kbang', 'Kông Chro',
    'Krông Pa', 'Mang Yang', 'Phú Thiện',
  ],
  'Hà Giang': [
    'TP. Hà Giang', 'Bắc Mê', 'Bắc Quang', 'Đồng Văn', 'Hoàng Su Phì', 'Mèo Vạc',
    'Quản Bạ', 'Quang Bình', 'Vị Xuyên', 'Xín Mần', 'Yên Minh',
  ],
  'Hà Nam': [
    'TP. Phủ Lý', 'Thị xã Duy Tiên', 'Thị xã Kim Bảng', 'Bình Lục', 'Lý Nhân', 'Thanh Liêm',
  ],
  'Hà Tĩnh': [
    'TP. Hà Tĩnh', 'Thị xã Hồng Lĩnh', 'Thị xã Kỳ Anh', 'Cẩm Xuyên', 'Can Lộc', 'Đức Thọ',
    'Hương Khê', 'Hương Sơn', 'Huyện Kỳ Anh', 'Lộc Hà', 'Nghi Xuân', 'Thạch Hà', 'Vũ Quang',
  ],
  'Hải Dương': [
    'TP. Hải Dương', 'TP. Chí Linh', 'Thị xã Kinh Môn', 'Bình Giang', 'Cẩm Giàng',
    'Gia Lộc', 'Kim Thành', 'Nam Sách', 'Ninh Giang', 'Thanh Hà', 'Thanh Miện', 'Tứ Kỳ',
  ],
  'Hậu Giang': [
    'TP. Vị Thanh', 'TP. Ngã Bảy', 'Thị xã Long Mỹ', 'Châu Thành', 'Châu Thành A', 'Huyện Long Mỹ', 'Phụng Hiệp', 'Vị Thủy',
  ],
  'Hòa Bình': [
    'TP. Hòa Bình', 'Cao Phong', 'Đà Bắc', 'Kim Bôi', 'Lạc Sơn', 'Lạc Thủy', 'Lương Sơn', 'Mai Châu', 'Tân Lạc', 'Yên Thủy',
  ],
  'Hưng Yên': [
    'TP. Hưng Yên', 'Mỹ Hào', 'Ân Thi', 'Khoái Châu', 'Kim Động', 'Phù Cừ', 'Tiên Lữ', 'Văn Giang', 'Văn Lâm', 'Yên Mỹ',
  ],
  'Khánh Hòa': [
    'Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Cam Lâm', 'Diên Khánh', 'Khánh Sơn', 'Khánh Vĩnh', 'Trường Sa', 'Vạn Ninh',
  ],
  'Kiên Giang': [
    'TP. Rạch Giá', 'TP. Hà Tiên', 'TP. Phú Quốc', 'An Biên', 'An Minh', 'Châu Thành',
    'Giang Thành', 'Giồng Riềng', 'Gò Quao', 'Hòn Đất', 'Kiên Hải', 'Kiên Lương',
    'Tân Hiệp', 'U Minh Thượng', 'Vĩnh Thuận',
  ],
  'Kon Tum': [
    'TP. Kon Tum', 'Đăk Glei', 'Đăk Hà', 'Đăk Tô', "Ia H'Drai", 'Kon Plông', 'Kon Rẫy', 'Ngọc Hồi', 'Sa Thầy', 'Tu Mơ Rông',
  ],
  'Lai Châu': [
    'TP. Lai Châu', 'Mường Tè', 'Nậm Nhùn', 'Phong Thổ', 'Sìn Hồ', 'Tam Đường', 'Tân Uyên', 'Than Uyên',
  ],
  'Lâm Đồng': [
    'Đà Lạt', 'Bảo Lộc', 'Bảo Lâm', 'Cát Tiên', 'Đạ Huoai', 'Đạ Tẻh', 'Đam Rông',
    'Di Linh', 'Đơn Dương', 'Đức Trọng', 'Lạc Dương', 'Lâm Hà',
  ],
  'Lạng Sơn': [
    'TP. Lạng Sơn', 'Bắc Sơn', 'Bình Gia', 'Cao Lộc', 'Chi Lăng', 'Đình Lập',
    'Hữu Lũng', 'Lộc Bình', 'Tràng Định', 'Văn Lãng', 'Văn Quan',
  ],
  'Lào Cai': [
    'TP. Lào Cai', 'Thị xã Sa Pa', 'Bắc Hà', 'Bảo Thắng', 'Bảo Yên', 'Bát Xát', 'Mường Khương', 'Si Ma Cai', 'Văn Bàn',
  ],
  'Long An': [
    'TP. Tân An', 'Thị xã Kiến Tường', 'Bến Lức', 'Cần Đước', 'Cần Giuộc', 'Châu Thành',
    'Đức Hòa', 'Đức Huệ', 'Mộc Hóa', 'Tân Hưng', 'Tân Thạnh', 'Tân Trụ', 'Thạnh Hóa', 'Thủ Thừa', 'Vĩnh Hưng',
  ],
  'Nam Định': [
    'TP. Nam Định', 'Giao Thủy', 'Hải Hậu', 'Nam Trực', 'Nghĩa Hưng', 'Trực Ninh', 'Vụ Bản', 'Xuân Trường', 'Ý Yên',
  ],
  'Nghệ An': [
    'TP. Vinh', 'Cửa Lò', 'Thị xã Hoàng Mai', 'Thị xã Thái Hòa', 'Anh Sơn', 'Con Cuông',
    'Diễn Châu', 'Đô Lương', 'Hưng Nguyên', 'Kỳ Sơn', 'Nam Đàn', 'Nghi Lộc', 'Nghĩa Đàn',
    'Quế Phong', 'Quỳ Châu', 'Quỳ Hợp', 'Quỳnh Lưu', 'Tân Kỳ', 'Thanh Chương', 'Tương Dương', 'Yên Thành',
  ],
  'Ninh Bình': [
    'TP. Ninh Bình', 'TP. Tam Điệp', 'Gia Viễn', 'Hoa Lư', 'Kim Sơn', 'Nho Quan', 'Yên Khánh', 'Yên Mô',
  ],
  'Ninh Thuận': [
    'TP. Phan Rang - Tháp Chàm', 'Bác Ái', 'Ninh Hải', 'Ninh Phước', 'Ninh Sơn', 'Thuận Bắc', 'Thuận Nam',
  ],
  'Phú Thọ': [
    'TP. Việt Trì', 'Thị xã Phú Thọ', 'Cẩm Khê', 'Đoan Hùng', 'Hạ Hòa', 'Lâm Thao',
    'Phù Ninh', 'Tam Nông', 'Tân Sơn', 'Thanh Ba', 'Thanh Sơn', 'Thanh Thủy', 'Yên Lập',
  ],
  'Phú Yên': [
    'TP. Tuy Hòa', 'Thị xã Đông Hòa', 'Thị xã Sông Cầu', 'Đồng Xuân', 'Phú Hòa', 'Sơn Hòa', 'Sông Hinh', 'Tây Hòa', 'Tuy An',
  ],
  'Quảng Bình': [
    'TP. Đồng Hới', 'Thị xã Ba Đồn', 'Bố Trạch', 'Lệ Thủy', 'Minh Hóa', 'Quảng Ninh', 'Quảng Trạch', 'Tuyên Hóa',
  ],
  'Quảng Nam': [
    'TP. Tam Kỳ', 'TP. Hội An', 'Thị xã Điện Bàn', 'Bắc Trà My', 'Đại Lộc', 'Đông Giang',
    'Duy Xuyên', 'Hiệp Đức', 'Nam Giang', 'Nam Trà My', 'Nông Sơn', 'Núi Thành', 'Phú Ninh',
    'Phước Sơn', 'Quế Sơn', 'Tây Giang', 'Thăng Bình', 'Tiên Phước',
  ],
  'Quảng Ngãi': [
    'TP. Quảng Ngãi', 'Thị xã Đức Phổ', 'Ba Tơ', 'Bình Sơn', 'Lý Sơn', 'Minh Long',
    'Mộ Đức', 'Nghĩa Hành', 'Sơn Hà', 'Sơn Tây', 'Sơn Tịnh', 'Trà Bồng', 'Tư Nghĩa',
  ],
  'Quảng Ninh': [
    'Hạ Long', 'Cẩm Phả', 'Móng Cái', 'Uông Bí', 'TP. Đông Triều', 'Thị xã Quảng Yên',
    'Ba Chẽ', 'Bình Liêu', 'Cô Tô', 'Đầm Hà', 'Hải Hà', 'Tiên Yên', 'Vân Đồn',
  ],
  'Quảng Trị': [
    'TP. Đông Hà', 'Thị xã Quảng Trị', 'Cam Lộ', 'Cồn Cỏ', 'Đa Krông', 'Gio Linh', 'Hải Lăng', 'Hướng Hóa', 'Triệu Phong', 'Vĩnh Linh',
  ],
  'Sóc Trăng': [
    'TP. Sóc Trăng', 'Thị xã Ngã Năm', 'Thị xã Vĩnh Châu', 'Châu Thành', 'Cù Lao Dung',
    'Kế Sách', 'Long Phú', 'Mỹ Tú', 'Mỹ Xuyên', 'Thạnh Trị', 'Trần Đề',
  ],
  'Sơn La': [
    'TP. Sơn La', 'Thị xã Mộc Châu', 'Bắc Yên', 'Mai Sơn', 'Mường La', 'Phù Yên',
    'Quỳnh Nhai', 'Sông Mã', 'Sốp Cộp', 'Thuận Châu', 'Vân Hồ', 'Yên Châu',
  ],
  'Tây Ninh': [
    'TP. Tây Ninh', 'Thị xã Hòa Thành', 'Thị xã Trảng Bàng', 'Bến Cầu', 'Châu Thành',
    'Dương Minh Châu', 'Gò Dầu', 'Tân Biên', 'Tân Châu',
  ],
  'Thái Bình': [
    'TP. Thái Bình', 'Đông Hưng', 'Hưng Hà', 'Kiến Xương', 'Quỳnh Phụ', 'Thái Thụy', 'Tiền Hải', 'Vũ Thư',
  ],
  'Thái Nguyên': [
    'TP. Thái Nguyên', 'Sông Công', 'Phổ Yên', 'Đại Từ', 'Định Hóa', 'Đồng Hỷ', 'Phú Bình', 'Phú Lương', 'Võ Nhai',
  ],
  'Thanh Hóa': [
    'TP. Thanh Hóa', 'Sầm Sơn', 'Bỉm Sơn', 'Thị xã Nghi Sơn', 'Bá Thước', 'Cẩm Thủy',
    'Đông Sơn', 'Hà Trung', 'Hậu Lộc', 'Hoằng Hóa', 'Lang Chánh', 'Mường Lát', 'Nga Sơn',
    'Ngọc Lặc', 'Như Thanh', 'Như Xuân', 'Nông Cống', 'Quan Hóa', 'Quan Sơn', 'Quảng Xương',
    'Thạch Thành', 'Thiệu Hóa', 'Thọ Xuân', 'Thường Xuân', 'Triệu Sơn', 'Vĩnh Lộc', 'Yên Định',
  ],
  'Thừa Thiên Huế': [
    'TP. Huế', 'Hương Thủy', 'Hương Trà', 'A Lưới', 'Nam Đông', 'Phong Điền', 'Phú Lộc', 'Phú Vang', 'Quảng Điền',
  ],
  'Tiền Giang': [
    'TP. Mỹ Tho', 'TP. Gò Công', 'Thị xã Cai Lậy', 'Cái Bè', 'Huyện Cai Lậy', 'Châu Thành',
    'Chợ Gạo', 'Gò Công Đông', 'Gò Công Tây', 'Tân Phú Đông', 'Tân Phước',
  ],
  'Trà Vinh': [
    'TP. Trà Vinh', 'Thị xã Duyên Hải', 'Càng Long', 'Cầu Kè', 'Cầu Ngang', 'Châu Thành',
    'Huyện Duyên Hải', 'Tiểu Cần', 'Trà Cú',
  ],
  'Tuyên Quang': [
    'TP. Tuyên Quang', 'Chiêm Hóa', 'Hàm Yên', 'Lâm Bình', 'Na Hang', 'Sơn Dương', 'Yên Sơn',
  ],
  'Vĩnh Long': [
    'TP. Vĩnh Long', 'Thị xã Bình Minh', 'Bình Tân', 'Long Hồ', 'Mang Thít', 'Tam Bình', 'Trà Ôn', 'Vũng Liêm',
  ],
  'Vĩnh Phúc': [
    'TP. Vĩnh Yên', 'TP. Phúc Yên', 'Bình Xuyên', 'Lập Thạch', 'Sông Lô', 'Tam Đảo', 'Tam Dương', 'Vĩnh Tường', 'Yên Lạc',
  ],
  'Yên Bái': [
    'TP. Yên Bái', 'Thị xã Nghĩa Lộ', 'Lục Yên', 'Mù Cang Chải', 'Trạm Tấu', 'Trấn Yên', 'Văn Chấn', 'Văn Yên', 'Yên Bình',
  ],
};

const EXPLICIT_WARDS_BY_DISTRICT = {
  // Hà Nội (30 quận/huyện/thị xã)
  'Hà Nội|Ba Đình': ['Cống Vị', 'Điện Biên', 'Đội Cấn', 'Giảng Võ', 'Kim Mã', 'Liễu Giai', 'Ngọc Hà', 'Ngọc Khánh', 'Nguyễn Trung Trực', 'Phúc Xá', 'Quán Thánh', 'Thành Công', 'Trúc Bạch', 'Vĩnh Phúc'],
  'Hà Nội|Bắc Từ Liêm': ['Cổ Nhuế 1', 'Cổ Nhuế 2', 'Đông Ngạc', 'Đức Thắng', 'Liên Mạc', 'Minh Khai', 'Phú Diễn', 'Phúc Diễn', 'Tây Tựu', 'Thượng Cát', 'Thụy Phương', 'Xuân Đỉnh', 'Xuân Tảo'],
  'Hà Nội|Cầu Giấy': ['Dịch Vọng', 'Dịch Vọng Hậu', 'Mai Dịch', 'Nghĩa Đô', 'Nghĩa Tân', 'Quan Hoa', 'Trung Hòa', 'Yên Hòa'],
  'Hà Nội|Đống Đa': ['Cát Linh', 'Hàng Bột', 'Khâm Thiên', 'Khương Thượng', 'Kim Liên', 'Láng Hạ', 'Láng Thượng', 'Nam Đồng', 'Ngã Tư Sở', 'Ô Chợ Dừa', 'Phương Liên', 'Phương Mai', 'Quang Trung', 'Quốc Tử Giám', 'Thịnh Quang', 'Thổ Quan', 'Trung Liệt', 'Trung Phụng', 'Trung Tự', 'Văn Chương', 'Văn Miếu'],
  'Hà Nội|Hà Đông': ['Biên Giang', 'Đồng Mai', 'Dương Nội', 'Hà Cầu', 'Kiến Hưng', 'La Khê', 'Mộ Lao', 'Nguyễn Trãi', 'Phú La', 'Phú Lãm', 'Phú Lương', 'Phúc La', 'Quang Trung', 'Vạn Phúc', 'Văn Quán', 'Yên Nghĩa', 'Yết Kiêu'],
  'Hà Nội|Hai Bà Trưng': ['Bách Khoa', 'Bạch Đằng', 'Bạch Mai', 'Cầu Dền', 'Đống Mác', 'Đồng Nhân', 'Đồng Tâm', 'Lê Đại Hành', 'Minh Khai', 'Ngô Thì Nhậm', 'Nguyễn Du', 'Phạm Đình Hổ', 'Phố Huế', 'Quỳnh Lôi', 'Quỳnh Mai', 'Thanh Lương', 'Thanh Nhàn', 'Trương Định', 'Vĩnh Tuy'],
  'Hà Nội|Hoàn Kiếm': ['Chương Dương', 'Cửa Đông', 'Cửa Nam', 'Đồng Xuân', 'Hàng Bạc', 'Hàng Bài', 'Hàng Bồ', 'Hàng Bông', 'Hàng Buồm', 'Hàng Đào', 'Hàng Gai', 'Hàng Mã', 'Hàng Trống', 'Lý Thái Tổ', 'Phan Chu Trinh', 'Phúc Tân', 'Trần Hưng Đạo', 'Tràng Tiền'],
  'Hà Nội|Hoàng Mai': ['Đại Kim', 'Định Công', 'Giáp Bát', 'Hoàng Liệt', 'Hoàng Văn Thụ', 'Lĩnh Nam', 'Mai Động', 'Tân Mai', 'Thanh Trì', 'Thịnh Liệt', 'Trần Phú', 'Tương Mai', 'Vĩnh Hưng', 'Yên Sở'],
  'Hà Nội|Long Biên': ['Bồ Đề', 'Cự Khối', 'Đức Giang', 'Gia Thụy', 'Giang Biên', 'Long Biên', 'Ngọc Lâm', 'Ngọc Thụy', 'Phúc Đồng', 'Phúc Lợi', 'Sài Đồng', 'Thạch Bàn', 'Thượng Thanh', 'Việt Hưng'],
  'Hà Nội|Nam Từ Liêm': ['Cầu Diễn', 'Đại Mỗ', 'Mễ Trì', 'Mỹ Đình 1', 'Mỹ Đình 2', 'Phú Đô', 'Phương Canh', 'Tây Mỗ', 'Trung Văn', 'Xuân Phương'],
  'Hà Nội|Tây Hồ': ['Bưởi', 'Nhật Tân', 'Phú Thượng', 'Quảng An', 'Thụy Khuê', 'Tứ Liên', 'Xuân La', 'Yên Phụ'],
  'Hà Nội|Thanh Xuân': ['Hạ Đình', 'Khương Đình', 'Khương Mai', 'Khương Trung', 'Kim Giang', 'Nhân Chính', 'Phương Liệt', 'Thanh Xuân Bắc', 'Thanh Xuân Nam', 'Thanh Xuân Trung', 'Thượng Đình'],
  'Hà Nội|Thị xã Sơn Tây': ['Lê Lợi', 'Ngô Quyền', 'Phú Thịnh', 'Quang Trung', 'Sơn Lộc', 'Trung Hưng', 'Trung Sơn Trầm', 'Viên Sơn', 'Xuân Khanh', 'Cổ Đông', 'Đường Lâm', 'Kim Sơn', 'Sơn Đông', 'Thanh Mỹ', 'Xuân Sơn'],
  'Hà Nội|Đông Anh': ['Thị trấn Đông Anh', 'Bắc Hồng', 'Cổ Loa', 'Đại Mạch', 'Đông Hội', 'Dục Tú', 'Hải Bối', 'Kim Chung', 'Kim Nỗ', 'Liên Hà', 'Mai Lâm', 'Nam Hồng', 'Nguyên Khê', 'Tàm Xá', 'Thụy Lâm', 'Tiên Dương', 'Uy Nỗ', 'Vân Hà', 'Vân Nội', 'Việt Hùng', 'Vĩnh Ngọc', 'Võng La', 'Xuân Canh', 'Xuân Nộn'],
  'Hà Nội|Gia Lâm': ['Thị trấn Trâu Quỳ', 'Thị trấn Yên Viên', 'Bát Tràng', 'Cổ Bi', 'Đa Tốn', 'Đặng Xá', 'Đình Xuyên', 'Dương Hà', 'Dương Quang', 'Dương Xá', 'Kiêu Kỵ', 'Kim Đức', 'Kim Sơn', 'Lệ Chi', 'Ninh Hiệp', 'Phù Đổng', 'Phú Thị', 'Trung Mầu', 'Văn Đức', 'Yên Thường', 'Yên Viên'],
  'Hà Nội|Hoài Đức': ['Thị trấn Trạm Trôi', 'An Khánh', 'An Thượng', 'Cát Quế', 'Đắc Sở', 'Di Trạch', 'Đông La', 'Đức Giang', 'Đức Thượng', 'Dương Liễu', 'Kim Chung', 'La Phù', 'Lại Yên', 'Minh Khai', 'Sơn Đồng', 'Song Phương', 'Tiền Yên', 'Vân Canh', 'Vân Côn', 'Yên Sở'],
  'Hà Nội|Thanh Trì': ['Thị trấn Văn Điển', 'Đại Áng', 'Đông Mỹ', 'Duyên Hà', 'Hữu Hòa', 'Liên Ninh', 'Ngọc Hồi', 'Ngũ Hiệp', 'Tả Thanh Oai', 'Tam Hiệp', 'Tân Triều', 'Thanh Liệt', 'Tứ Hiệp', 'Vạn Phúc', 'Vĩnh Quỳnh', 'Yên Mỹ'],
  'Hà Nội|Thạch Thất': ['Thị trấn Liên Quan', 'Bình Phú', 'Bình Yên', 'Cẩm Yên', 'Cần Kiệm', 'Canh Nậu', 'Chàng Sơn', 'Đại Đồng', 'Dị Nậu', 'Đồng Trúc', 'Hạ Bằng', 'Hương Ngải', 'Hữu Bằng', 'Kim Quan', 'Lại Thượng', 'Phú Kim', 'Phùng Xá', 'Tân Xã', 'Thạch Hòa', 'Thạch Xá', 'Tiến Xuân', 'Yên Bình', 'Yên Trung'],
  'Hà Nội|Mê Linh': ['Thị trấn Chi Đông', 'Thị trấn Quang Minh', 'Chu Phan', 'Đại Thịnh', 'Hoàng Kim', 'Kim Hoa', 'Liên Mạc', 'Mê Linh', 'Tam Đồng', 'Thạch Đà', 'Thanh Lâm', 'Tiền Phong', 'Tiến Thắng', 'Tiến Thịnh', 'Tráng Việt', 'Tự Lập', 'Vạn Yên', 'Văn Khê'],
  'Hà Nội|Sóc Sơn': ['Thị trấn Sóc Sơn', 'Bắc Phú', 'Bắc Sơn', 'Đông Xuân', 'Đức Hòa', 'Hiền Ninh', 'Hồng Kỳ', 'Kim Lũ', 'Mai Đình', 'Minh Phú', 'Minh Trí', 'Nam Sơn', 'Phú Cường', 'Phù Linh', 'Phù Lỗ', 'Phú Minh', 'Quang Tiến', 'Tân Dân', 'Tân Hưng', 'Tân Minh', 'Thanh Xuân', 'Tiên Dược', 'Trung Giã', 'Việt Long', 'Xuân Giang', 'Xuân Thu'],
  'Hà Nội|Chương Mỹ': ['Thị trấn Chúc Sơn', 'Thị trấn Xuân Mai', 'Đại Yên', 'Đông Phương Yên', 'Đông Sơn', 'Đồng Lạc', 'Đồng Phú', 'Hòa Chính', 'Hoàng Diệu', 'Hoàng Văn Thụ', 'Hồng Phong', 'Hợp Đồng', 'Hữu Văn', 'Lam Điền', 'Mỹ Lương', 'Nam Phương Tiến', 'Ngọc Hòa', 'Phú Nam An', 'Phú Nghĩa', 'Phụng Châu', 'Quảng Bị', 'Tân Tiến', 'Thanh Bình', 'Thượng Vực', 'Thụy Hương', 'Thủy Xuân Tiên', 'Tiên Phương', 'Tốt Động', 'Trần Phú', 'Trung Hòa', 'Trường Yên', 'Văn Võ'],
  'Hà Nội|Đan Phượng': ['Thị trấn Phùng', 'Đan Phượng', 'Đồng Tháp', 'Hạ Mỗ', 'Hồng Hà', 'Liên Hà', 'Liên Hồng', 'Liên Trung', 'Phương Đình', 'Song Phượng', 'Tân Hội', 'Tân Lập', 'Thọ An', 'Thọ Xuân', 'Thượng Mỗ', 'Trung Châu'],
  'Hà Nội|Quốc Oai': ['Thị trấn Quốc Oai', 'Cấn Hữu', 'Cộng Hòa', 'Đại Thành', 'Đồng Quang', 'Đông Xuân', 'Đông Yên', 'Hòa Thạch', 'Liệp Tuyết', 'Nghĩa Hương', 'Ngọc Liệp', 'Ngọc Mỹ', 'Phú Cát', 'Phú Mãn', 'Phượng Cách', 'Sài Sơn', 'Tân Hòa', 'Tân Phú', 'Thạch Thán', 'Tuyết Nghĩa', 'Yên Sơn'],
  'Hà Nội|Thường Tín': ['Thị trấn Thường Tín', 'Chương Dương', 'Dũng Tiến', 'Duyên Thái', 'Hà Hồi', 'Hiền Giang', 'Hòa Bình', 'Hồng Vân', 'Khánh Hà', 'Lê Lợi', 'Liên Phương', 'Minh Cường', 'Nghiêm Xuyên', 'Nguyễn Trãi', 'Nhị Khê', 'Ninh Sở', 'Quất Động', 'Tân Minh', 'Thắng Lợi', 'Thống Nhất', 'Thư Phú', 'Tiền Phong', 'Tô Hiệu', 'Tự Nhiên', 'Văn Bình', 'Vạn Điểm', 'Văn Phú', 'Vân Tảo', 'Văn Tự'],
  'Hà Nội|Ba Vì': ['Thị trấn Tây Đằng', 'Ba Trại', 'Ba Vì', 'Cẩm Lĩnh', 'Cam Thượng', 'Châu Sơn', 'Chu Minh', 'Cổ Đô', 'Đông Quang', 'Đồng Thái', 'Khánh Thượng', 'Minh Châu', 'Minh Quang', 'Phong Vân', 'Phú Châu', 'Phú Cường', 'Phú Đông', 'Phú Phương', 'Phú Sơn', 'Sơn Đà', 'Tản Hồng', 'Tản Lĩnh', 'Thái Hòa', 'Thuần Mỹ', 'Thụy An', 'Tiên Phong', 'Tòng Bạt', 'Vân Hòa', 'Vạn Thắng', 'Vật Lại', 'Yên Bài'],
  'Hà Nội|Mỹ Đức': ['Thị trấn Đại Nghĩa', 'An Mỹ', 'An Phú', 'An Tiến', 'Bột Xuyên', 'Đại Hưng', 'Đốc Tín', 'Đồng Tâm', 'Hồng Sơn', 'Hợp Thanh', 'Hợp Tiến', 'Hùng Tiến', 'Hương Sơn', 'Lê Thanh', 'Mỹ Thành', 'Phù Lưu Tế', 'Phúc Lâm', 'Phùng Xá', 'Thượng Lâm', 'Tuy Lai', 'Vạn Kim', 'Xuy Xá'],
  'Hà Nội|Phú Xuyên': ['Thị trấn Phú Minh', 'Thị trấn Phú Xuyên', 'Bạch Hạ', 'Châu Can', 'Chuyên Mỹ', 'Đại Thắng', 'Đại Xuyên', 'Hoàng Long', 'Hồng Minh', 'Hồng Thái', 'Khai Thái', 'Minh Tân', 'Nam Phong', 'Nam Tiến', 'Nam Triều', 'Phú Túc', 'Phú Yên', 'Phúc Tiến', 'Phượng Dực', 'Quang Lãng', 'Quang Trung', 'Sơn Hà', 'Tân Dân', 'Tri Thủy', 'Tri Trung', 'Văn Hoàng', 'Vân Từ'],
  'Hà Nội|Phúc Thọ': ['Thị trấn Phúc Thọ', 'Hát Môn', 'Hiệp Thuận', 'Liên Hiệp', 'Long Xuyên', 'Ngọc Tảo', 'Phúc Hòa', 'Phụng Thượng', 'Sen Phương', 'Tam Hiệp', 'Tam Thuấn', 'Thanh Đa', 'Thọ Lộc', 'Thượng Cốc', 'Tích Giang', 'Trạch Mỹ Lộc', 'Vân Hà', 'Vân Nam', 'Vân Phúc', 'Võng Xuyên', 'Xuân Đình'],
  'Hà Nội|Thanh Oai': ['Thị trấn Kim Bài', 'Bích Hòa', 'Bình Minh', 'Cao Dương', 'Cao Viên', 'Cự Khê', 'Dân Hòa', 'Đỗ Động', 'Hồng Dương', 'Kim An', 'Kim Thư', 'Liên Châu', 'Mỹ Hưng', 'Phương Trung', 'Tam Hưng', 'Tân Ước', 'Thanh Cao', 'Thanh Mai', 'Thanh Thùy', 'Thanh Văn', 'Xuân Dương'],
  'Hà Nội|Ứng Hòa': ['Thị trấn Vân Đình', 'Cao Thành', 'Đại Cường', 'Đại Hùng', 'Đội Bình', 'Đông Lỗ', 'Đồng Tiến', 'Đồng Tân', 'Hoa Sơn', 'Hòa Lâm', 'Hòa Nam', 'Hòa Phú', 'Hòa Xá', 'Hồng Quang', 'Kim Đường', 'Liên Bạt', 'Lưu Hoàng', 'Minh Đức', 'Phù Lưu', 'Phương Tú', 'Quảng Phú Cầu', 'Sơn Công', 'Tảo Dương Văn', 'Trầm Lộng', 'Trung Tú', 'Trường Thịnh', 'Vạn Thái', 'Viên An', 'Viên Nội'],

  // TP.HCM (22 quận/huyện/TP)
  'TP.HCM|TP. Thủ Đức': ['An Khánh', 'An Lợi Đông', 'An Phú', 'Bình Chiểu', 'Bình Thọ', 'Bình Trưng Đông', 'Bình Trưng Tây', 'Cát Lái', 'Hiệp Bình Chánh', 'Hiệp Bình Phước', 'Hiệp Phú', 'Linh Chiểu', 'Linh Đông', 'Linh Tây', 'Linh Trung', 'Linh Xuân', 'Long Bình', 'Long Phước', 'Long Thạnh Mỹ', 'Long Trường', 'Phú Hữu', 'Phước Bình', 'Phước Long A', 'Phước Long B', 'Tam Bình', 'Tam Phú', 'Tăng Nhơn Phú A', 'Tăng Nhơn Phú B', 'Tân Phú', 'Thạnh Mỹ Lợi', 'Thảo Điền', 'Thủ Thiêm', 'Trường Thạnh', 'Trường Thọ'],
  'TP.HCM|Quận 1': ['Bến Nghé', 'Bến Thành', 'Cầu Kho', 'Cầu Ông Lãnh', 'Cô Giang', 'Đa Kao', 'Nguyễn Cư Trinh', 'Nguyễn Thái Bình', 'Phạm Ngũ Lão', 'Tân Định'],
  'TP.HCM|Quận 3': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Võ Thị Sáu', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
  'TP.HCM|Quận 4': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 6', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 18'],
  'TP.HCM|Quận 5': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
  'TP.HCM|Quận 6': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
  'TP.HCM|Quận 7': ['Bình Thuận', 'Phú Mỹ', 'Phú Thuận', 'Tân Hưng', 'Tân Kiểng', 'Tân Phong', 'Tân Phú', 'Tân Quy', 'Tân Thuận Đông', 'Tân Thuận Tây'],
  'TP.HCM|Quận 8': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16'],
  'TP.HCM|Quận 10': ['Phường 1', 'Phường 2', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
  'TP.HCM|Quận 11': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16'],
  'TP.HCM|Quận 12': ['An Phú Đông', 'Đông Hưng Thuận', 'Hiệp Thành', 'Tân Chánh Hiệp', 'Tân Hưng Thuận', 'Tân Thới Hiệp', 'Tân Thới Nhất', 'Thạnh Lộc', 'Thạnh Xuân', 'Thới An', 'Trung Mỹ Tây'],
  'TP.HCM|Bình Tân': ['An Lạc', 'An Lạc A', 'Bình Hưng Hòa', 'Bình Hưng Hòa A', 'Bình Hưng Hòa B', 'Bình Trị Đông', 'Bình Trị Đông A', 'Bình Trị Đông B', 'Tân Tạo', 'Tân Tạo A'],
  'TP.HCM|Bình Thạnh': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 17', 'Phường 19', 'Phường 21', 'Phường 22', 'Phường 24', 'Phường 25', 'Phường 26', 'Phường 27', 'Phường 28'],
  'TP.HCM|Gò Vấp': ['Phường 1', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 17'],
  'TP.HCM|Phú Nhuận': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 13', 'Phường 15', 'Phường 17'],
  'TP.HCM|Tân Bình': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
  'TP.HCM|Tân Phú': ['Hiệp Tân', 'Hòa Thạnh', 'Phú Thạnh', 'Phú Thọ Hòa', 'Phú Trung', 'Sơn Kỳ', 'Tân Quý', 'Tân Sơn Nhì', 'Tân Thành', 'Tân Thới Hòa', 'Tây Thạnh'],
  'TP.HCM|Bình Chánh': ['Thị trấn Tân Túc', 'An Phú Tây', 'Bình Chánh', 'Bình Hưng', 'Bình Lợi', 'Đa Phước', 'Hưng Long', 'Lê Minh Xuân', 'Phạm Văn Hai', 'Phong Phú', 'Quy Đức', 'Tân Kiên', 'Tân Nhựt', 'Tân Quý Tây', 'Vĩnh Lộc A', 'Vĩnh Lộc B'],
  'TP.HCM|Cần Giờ': ['Thị trấn Cần Thạnh', 'An Thới Đông', 'Bình Khánh', 'Long Hòa', 'Lý Nhơn', 'Tam Thôn Hiệp', 'Thạnh An'],
  'TP.HCM|Củ Chi': ['Thị trấn Củ Chi', 'An Nhơn Tây', 'An Phú', 'Bình Mỹ', 'Hòa Phú', 'Nhuận Đức', 'Phạm Văn Cội', 'Phú Hòa Đông', 'Phú Mỹ Hưng', 'Phước Hiệp', 'Phước Thạnh', 'Phước Vĩnh An', 'Tân An Hội', 'Tân Phú Trung', 'Tân Thạnh Đông', 'Tân Thạnh Tây', 'Tân Thông Hội', 'Thái Mỹ', 'Trung An', 'Trung Lập Hạ', 'Trung Lập Thượng'],
  'TP.HCM|Hóc Môn': ['Thị trấn Hóc Môn', 'Bà Điểm', 'Đông Thạnh', 'Nhị Bình', 'Tân Hiệp', 'Tân Thới Nhì', 'Tân Xuân', 'Thới Tam Thôn', 'Trung Chánh', 'Xuân Thới Đông', 'Xuân Thới Sơn', 'Xuân Thới Thượng'],
  'TP.HCM|Nhà Bè': ['Thị trấn Nhà Bè', 'Hiệp Phước', 'Long Thới', 'Nhơn Đức', 'Phú Xuân', 'Phước Kiển', 'Phước Lộc'],

  // Đà Nẵng (8 quận/huyện)
  'Đà Nẵng|Cẩm Lệ': ['Hòa An', 'Hòa Phát', 'Hòa Thọ Đông', 'Hòa Thọ Tây', 'Hòa Xuân', 'Khuê Trung'],
  'Đà Nẵng|Hải Châu': ['Bình Hiên', 'Bình Thuận', 'Hải Châu 1', 'Hải Châu 2', 'Hòa Cường Bắc', 'Hòa Cường Nam', 'Hòa Thuận Đông', 'Hòa Thuận Tây', 'Nam Dương', 'Phước Ninh', 'Thạch Thang', 'Thanh Bình', 'Thuận Phước'],
  'Đà Nẵng|Hòa Vang': ['Hòa Bắc', 'Hòa Châu', 'Hòa Khương', 'Hòa Liên', 'Hòa Nhơn', 'Hòa Ninh', 'Hòa Phong', 'Hòa Phú', 'Hòa Phước', 'Hòa Sơn', 'Hòa Tiến'],
  'Đà Nẵng|Hoàng Sa': ['Huyện đảo Hoàng Sa'],
  'Đà Nẵng|Liên Chiểu': ['Hòa Hiệp Bắc', 'Hòa Hiệp Nam', 'Hòa Khánh Bắc', 'Hòa Khánh Nam', 'Hòa Minh'],
  'Đà Nẵng|Ngũ Hành Sơn': ['Hòa Hải', 'Hòa Quý', 'Khuê Mỹ', 'Mỹ An'],
  'Đà Nẵng|Sơn Trà': ['An Hải Bắc', 'An Hải Đông', 'An Hải Tây', 'Mân Thái', 'Nại Hiên Đông', 'Phước Mỹ', 'Thọ Quang'],
  'Đà Nẵng|Thanh Khê': ['An Khê', 'Chính Gián', 'Hòa Khê', 'Tam Thuận', 'Tân Chính', 'Thạc Gián', 'Thanh Khê Đông', 'Thanh Khê Tây', 'Vĩnh Trung', 'Xuân Hà'],

  // Hải Phòng
  'Hải Phòng|Hồng Bàng': ['Hoàng Văn Thụ', 'Hùng Vương', 'Minh Khai', 'Phan Bội Châu', 'Quán Toan', 'Sở Dầu', 'Thượng Lý', 'Trại Chuối'],
  'Hải Phòng|Lê Chân': ['An Biên', 'An Dương', 'Cát Dài', 'Đông Hải', 'Dư Hàng', 'Dư Hàng Kênh', 'Hàng Kênh', 'Hồ Nam', 'Kênh Dương', 'Lam Sơn', 'Nghĩa Xá', 'Niệm Nghĩa', 'Trại Cau', 'Trần Nguyên Hãn', 'Vĩnh Niệm'],
  'Hải Phòng|Ngô Quyền': ['Cầu Đất', 'Cầu Tre', 'Đằng Giang', 'Đông Khê', 'Đồng Quốc Bình', 'Gia Viên', 'Lạc Viên', 'Lạch Tray', 'Lê Lợi', 'Máy Chai', 'Máy Tơ', 'Vạn Mỹ'],
  'Hải Phòng|Hải An': ['Cát Bi', 'Đằng Hải', 'Đằng Lâm', 'Đông Hải 1', 'Đông Hải 2', 'Nam Hải', 'Thành Tô', 'Tràng Cát'],
  'Hải Phòng|Kiến An': ['Bắc Sơn', 'Đồng Hòa', 'Lãm Hà', 'Nam Sơn', 'Ngọc Sơn', 'Phù Liễn', 'Quán Trữ', 'Trần Thành Ngọ', 'Tràng Minh', 'Văn Đẩu'],
  'Hải Phòng|Đồ Sơn': ['Bàng La', 'Hải Sơn', 'Hợp Đức', 'Minh Đức', 'Ngọc Xuyên', 'Vạn Hương'],
  'Hải Phòng|Dương Kinh': ['Anh Dũng', 'Đa Phúc', 'Hải Thành', 'Hòa Nghĩa', 'Hưng Đạo', 'Tân Thành'],
  'Hải Phòng|Thủy Nguyên': ['Thị trấn Minh Đức', 'Thị trấn Núi Đèo', 'An Lư', 'Dương Quan', 'Hoa Động', 'Hoàng Động', 'Lập Lễ', 'Lê Hồng Phong', 'Lưu Kiếm', 'Ngũ Lão', 'Phả Lễ', 'Phục Lễ', 'Quảng Thanh', 'Tam Hưng', 'Thiên Hương', 'Thủy Đường', 'Thủy Sơn', 'Thủy Triều'],

  // Cần Thơ
  'Cần Thơ|Ninh Kiều': ['An Bình', 'An Cư', 'An Hòa', 'An Khánh', 'An Nghiệp', 'An Phú', 'Cái Khế', 'Hưng Lợi', 'Tân An', 'Thới Bình', 'Xuân Khánh'],
  'Cần Thơ|Bình Thủy': ['An Thới', 'Bình Thủy', 'Bùi Hữu Nghĩa', 'Long Hòa', 'Long Tuyền', 'Thới An Đông', 'Trà An', 'Trà Nóc'],
  'Cần Thơ|Cái Răng': ['Ba Láng', 'Hưng Phú', 'Hưng Thạnh', 'Lê Bình', 'Phú Thứ', 'Tân Phú', 'Thường Thạnh'],
  'Cần Thơ|Ô Môn': ['Châu Văn Liêm', 'Long Hưng', 'Phước Thới', 'Thới An', 'Thới Hòa', 'Thới Long', 'Trường Lạc'],
  'Cần Thơ|Thốt Nốt': ['Thốt Nốt', 'Thới Thuận', 'Thuận An', 'Thuận Hưng', 'Tân Hưng', 'Tân Lộc', 'Thạnh Hòa', 'Trung Kiên', 'Trung Nhứt'],

  // Bình Dương & Đồng Nai
  'Bình Dương|Thủ Dầu Một': ['Chánh Mỹ', 'Chánh Nghĩa', 'Định Hòa', 'Hiệp An', 'Hiệp Thành', 'Hòa Phú', 'Phú Cường', 'Phú Hòa', 'Phú Lợi', 'Phú Mỹ', 'Phú Tân', 'Phú Thọ', 'Tân An', 'Tương Bình Hiệp'],
  'Bình Dương|Dĩ An': ['An Bình', 'Bình An', 'Bình Thắng', 'Dĩ An', 'Đông Hòa', 'Tân Bình', 'Tân Đông Hiệp'],
  'Bình Dương|Thuận An': ['An Phú', 'An Sơn', 'An Thạnh', 'Bình Chuẩn', 'Bình Hòa', 'Bình Nhâm', 'Hưng Định', 'Lái Thiêu', 'Thuận Giao', 'Vĩnh Phú'],
  'Bình Dương|Tân Uyên': ['Hội Nghĩa', 'Khánh Bình', 'Phú Chánh', 'Tân Hiệp', 'Tân Phước Khánh', 'Tân Vĩnh Hiệp', 'Thái Hòa', 'Thạnh Phước', 'Uyên Hưng', 'Vĩnh Tân', 'Bạch Đằng', 'Thạnh Hội'],
  'Bình Dương|Bến Cát': ['Chánh Phú Hòa', 'Hòa Lợi', 'Mỹ Phước', 'Tân Định', 'Thới Hòa', 'An Điền', 'An Tây', 'Phú An'],
  'Đồng Nai|Biên Hòa': ['An Bình', 'An Hòa', 'Bình Đa', 'Bửu Hòa', 'Bửu Long', 'Hiệp Hòa', 'Hóa An', 'Hố Nai', 'Long Bình', 'Long Bình Tân', 'Long Hưng', 'Phước Tân', 'Quang Vinh', 'Quyết Thắng', 'Tam Hiệp', 'Tam Hòa', 'Tam Phước', 'Tân Biên', 'Tân Hạnh', 'Tân Hiệp', 'Tân Hòa', 'Tân Mai', 'Tân Phong', 'Tân Tiến', 'Tân Vạn', 'Thanh Bình', 'Thống Nhất', 'Trảng Dài', 'Trung Dũng'],
  'Đồng Nai|Long Khánh': ['Bảo Quang', 'Bảo Vinh', 'Bàu Sen', 'Bình Lộc', 'Hàng Gòn', 'Phú Bình', 'Suối Tre', 'Xuân An', 'Xuân Bình', 'Xuân Hòa', 'Xuân Lập', 'Xuân Tân', 'Xuân Thanh', 'Xuân Trung'],
  'Đồng Nai|Long Thành': ['Thị trấn Long Thành', 'An Phước', 'Bàu Cạn', 'Bình An', 'Bình Sơn', 'Cẩm Đường', 'Lộc An', 'Long An', 'Long Đức', 'Long Phước', 'Phước Bình', 'Phước Thái', 'Tam An', 'Tân Hiệp'],
  'Đồng Nai|Nhơn Trạch': ['Thị trấn Hiệp Phước', 'Đại Phước', 'Long Tân', 'Long Thọ', 'Phú Đông', 'Phú Hội', 'Phú Hữu', 'Phú Thạnh', 'Phước An', 'Phước Khánh', 'Phước Thiền', 'Vĩnh Thanh'],
  'Đồng Nai|Trảng Bom': ['Thị trấn Trảng Bom', 'An Viễn', 'Bắc Sơn', 'Bàu Hàm', 'Bình Minh', 'Cây Gáo', 'Đồi 61', 'Đông Hòa', 'Giang Điền', 'Hố Nai 3', 'Hưng Thịnh', 'Quảng Tiến', 'Sông Thao', 'Sông Trầu', 'Tây Hòa', 'Thanh Bình', 'Trung Hòa'],

  // Một số đô thị trọng điểm khác trên cả nước
  'Bà Rịa - Vũng Tàu|TP. Vũng Tàu': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Long Sơn', 'Nguyễn An Ninh', 'Rạch Dừa', 'Thắng Nhất', 'Thắng Nhì', 'Thắng Tam'],
  'Bà Rịa - Vũng Tàu|TP. Bà Rịa': ['Kim Dinh', 'Long Hương', 'Long Tâm', 'Long Toàn', 'Phước Hiệp', 'Phước Hưng', 'Phước Nguyên', 'Phước Trung', 'Hòa Long', 'Long Phước', 'Tân Hưng'],
  'Bắc Ninh|TP. Bắc Ninh': ['Đáp Cầu', 'Đại Phúc', 'Hạp Lĩnh', 'Kinh Bắc', 'Khắc Niệm', 'Khúc Xuyên', 'Ninh Xá', 'Phong Khê', 'Suối Hoa', 'Thị Cầu', 'Tiền An', 'Vạn An', 'Vân Dương', 'Vệ An', 'Võ Cường', 'Vũ Ninh', 'Hòa Long', 'Kim Chân', 'Nam Sơn'],
  'Bắc Ninh|Từ Sơn': ['Châu Khê', 'Đình Bảng', 'Đồng Kỵ', 'Đồng Nguyên', 'Đông Ngàn', 'Hương Mạc', 'Phù Chẩn', 'Phù Khê', 'Tam Sơn', 'Tân Hồng', 'Trang Hạ', 'Tương Giang'],
  'Thái Nguyên|TP. Thái Nguyên': ['Cam Giá', 'Chùa Hang', 'Đồng Bẩm', 'Đồng Quang', 'Gia Sàng', 'Hoàng Văn Thụ', 'Hương Sơn', 'Phan Đình Phùng', 'Phú Xá', 'Quan Triều', 'Quang Trung', 'Quang Vinh', 'Tân Lập', 'Tân Long', 'Tân Thành', 'Tân Thịnh', 'Thịnh Đán', 'Tích Lương', 'Trung Thành', 'Trưng Vương', 'Túc Duyên'],
  'Quảng Ninh|Hạ Long': ['Bạch Đằng', 'Bãi Cháy', 'B Cao', 'Cao Thắng', 'Cao Xanh', 'Đại Yên', 'Giếng Đáy', 'Hà Khánh', 'Hà Khẩu', 'Hà Lầm', 'Hà Phong', 'Hà Trung', 'Hà Tu', 'Hồng Gai', 'Hồng Hà', 'Hồng Hải', 'Hoành Bồ', 'Hùng Thắng', 'Trần Hưng Đạo', 'Tuần Châu', 'Việt Hưng', 'Yết Kiêu'],
  'Thanh Hóa|TP. Thanh Hóa': ['An Hưng', 'Ba Đình', 'Đông Cương', 'Đông Hải', 'Đông Hương', 'Đông Sơn', 'Đông Thọ', 'Đông Vệ', 'Điện Biên', 'Hàm Rồng', 'Lam Sơn', 'Long Anh', 'Nam Ngạn', 'Ngọc Trạo', 'Phú Sơn', 'Quảng Hưng', 'Quảng Phú', 'Quảng Tâm', 'Quảng Thành', 'Quảng Thắng', 'Quảng Thịnh', 'Tào Xuyên', 'Tân Sơn', 'Thiệu Dương', 'Thiệu Khánh', 'Trường Thi'],
  'Nghệ An|TP. Vinh': ['Bến Thủy', 'Cửa Nam', 'Đội Cung', 'Đông Vĩnh', 'Hà Huy Tập', 'Hồng Sơn', 'Hưng Bình', 'Hưng Dũng', 'Hưng Phúc', 'Lê Lợi', 'Lê Mao', 'Quán Bàu', 'Quang Trung', 'Trung Đô', 'Trường Thi', 'Vinh Tân'],
  'Thừa Thiên Huế|TP. Huế': ['An Cựu', 'An Đông', 'An Hòa', 'An Tây', 'Đông Ba', 'Gia Hội', 'Hương An', 'Hương Hồ', 'Hương Long', 'Hương Sơ', 'Hương Vinh', 'Kim Long', 'Phú Hậu', 'Phú Hội', 'Phú Nhuận', 'Phú Thượng', 'Phước Vĩnh', 'Phường Đúc', 'Tây Lộc', 'Thuận Hòa', 'Thuận Lộc', 'Thủy Biều', 'Thủy Vân', 'Thủy Xuân', 'Trường An', 'Vĩnh Ninh', 'Vỹ Dạ', 'Xuân Phú'],
  'Khánh Hòa|Nha Trang': ['Lộc Thọ', 'Ngọc Hiệp', 'Phước Hải', 'Phước Hòa', 'Phước Long', 'Phước Tân', 'Phước Tiến', 'Phương Sài', 'Phương Sơn', 'Tân Lập', 'Vạn Thắng', 'Vạn Thạnh', 'Vĩnh Hải', 'Vĩnh Hòa', 'Vĩnh Nguyên', 'Vĩnh Phước', 'Vĩnh Thọ', 'Vĩnh Trường', 'Xương Huân'],
  'Lâm Đồng|Đà Lạt': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Tà Nung', 'Trạm Hành', 'Xuân Thọ', 'Xuân Trường'],
  'Hưng Yên|TP. Hưng Yên': ['An Tảo', 'Hiến Nam', 'Hồng Châu', 'Lam Sơn', 'Lê Lợi', 'Minh Khai', 'Quang Trung', 'Bảo Khê', 'Hoàng Hanh', 'Hồng Nam', 'Liên Phương', 'Phú Cường', 'Phương Chiểu', 'Quảng Châu', 'Tân Hưng', 'Trung Nghĩa'],
  'Hải Dương|TP. Hải Dương': ['Ái Quốc', 'Bình Hàn', 'Cẩm Thượng', 'Hải Tân', 'Lê Thanh Nghị', 'Nam Đồng', 'Ngọc Châu', 'Nguyễn Trãi', 'Nhị Châu', 'Phạm Ngũ Lão', 'Quang Trung', 'Tân Bình', 'Tân Hưng', 'Thạch Khôi', 'Thanh Bình', 'Trần Hưng Đạo', 'Trần Phú', 'Tứ Minh', 'Việt Hòa'],
  'Nam Định|TP. Nam Định': ['Bà Triệu', 'Cửa Bắc', 'Cửa Nam', 'Hạ Long', 'Lộc Hạ', 'Lộc Vượng', 'Ngô Quyền', 'Nguyễn Du', 'Năng Tĩnh', 'Phan Đình Phùng', 'Quang Trung', 'Thống Nhất', 'Trần Đăng Ninh', 'Trần Hưng Đạo', 'Trần Quang Khải', 'Trần Tế Xương', 'Trường Thi', 'Văn Miếu', 'Vị Hoàng', 'Vị Xuyên'],
  'Bình Định|TP. Quy Nhơn': ['Bùi Thị Xuân', 'Đống Đa', 'Ghềnh Ráng', 'Hải Cảng', 'Lê Hồng Phong', 'Lê Lợi', 'Lý Thường Kiệt', 'Ngô Mây', 'Nguyễn Văn Cừ', 'Nhơn Bình', 'Nhơn Phú', 'Quang Trung', 'Thị Nại', 'Trần Hưng Đạo', 'Trần Phú', 'Trần Quang Diệu'],
  'Đắk Lắk|TP. Buôn Ma Thuột': ['Ea Tam', 'Khánh Xuân', 'Tân An', 'Tân Hòa', 'Tân Lập', 'Tân Lợi', 'Tân Thành', 'Tân Tiến', 'Thắng Lợi', 'Thành Công', 'Thành Nhất', 'Thống Nhất', 'Tự An'],
  'An Giang|TP. Long Xuyên': ['Bình Đức', 'Bình Khánh', 'Đông Xuyên', 'Mỹ Bình', 'Mỹ Hòa', 'Mỹ Long', 'Mỹ Phước', 'Mỹ Quý', 'Mỹ Thạnh', 'Mỹ Thới', 'Mỹ Xuyên'],
  'Kiên Giang|TP. Rạch Giá': ['An Bình', 'An Hòa', 'Rạch Sỏi', 'Vĩnh Bảo', 'Vĩnh Hiệp', 'Vĩnh Lạc', 'Vĩnh Lợi', 'Vĩnh Quang', 'Vĩnh Thanh', 'Vĩnh Thanh Vân', 'Vĩnh Thông'],
  'Kiên Giang|TP. Phú Quốc': ['An Thới', 'Dương Đông', 'Bãi Thơm', 'Cửa Cạn', 'Cửa Dương', 'Dương Tơ', 'Gành Dầu', 'Hàm Ninh', 'Thổ Châu'],
  'Long An|TP. Tân An': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Khánh Hậu', 'Tân Khánh'],
  'Tiền Giang|TP. Mỹ Tho': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 8', 'Phường 9', 'Phường 10', 'Tân Long', 'Đạo Thạnh', 'Mỹ Phong', 'Phước Thạnh', 'Tân Mỹ Chánh', 'Thới Sơn', 'Trung An'],
  'Bình Thuận|TP. Phan Thiết': ['Bình Hưng', 'Đức Long', 'Đức Nghĩa', 'Đức Thắng', 'Hàm Tiến', 'Hưng Long', 'Lạc Đạo', 'Mũi Né', 'Phú Hài', 'Phú Tài', 'Phú Thủy', 'Phú Trinh', 'Thanh Hải', 'Xuân An'],
  'Quảng Nam|TP. Tam Kỳ': ['An Mỹ', 'An Phú', 'An Sơn', 'An Xuân', 'Hòa Hương', 'Hòa Thuận', 'Phước Hòa', 'Tân Thạnh', 'Trường Xuân'],
  'Quảng Nam|TP. Hội An': ['Cẩm An', 'Cẩm Châu', 'Cẩm Nam', 'Cẩm Phô', 'Cửa Đại', 'Minh An', 'Sơn Phong', 'Tân An', 'Thanh Hà', 'Cẩm Hà', 'Cẩm Kim', 'Cẩm Thanh', 'Tân Hiệp'],
  'Vĩnh Phúc|TP. Vĩnh Yên': ['Định Trung', 'Đống Đa', 'Đồng Tâm', 'Hội Hợp', 'Khai Quang', 'Liên Bảo', 'Ngô Quyền', 'Thanh Trù', 'Tích Sơn'],
  'Bắc Giang|TP. Bắc Giang': ['Dĩnh Kế', 'Đa Mai', 'Hoàng Văn Thụ', 'Lê Lợi', 'Mỹ Độ', 'Ngô Quyền', 'Thọ Xương', 'Trần Nguyên Hãn', 'Trần Phú', 'Xương Giang'],
};

/**
 * Tự động bổ sung danh sách Phường/Xã/Thị trấn cho các Quận/Huyện còn lại
 * để toàn bộ 63/63 Tỉnh/Thành phố đều có dữ liệu cấp xã không bao giờ bị trống.
 */
const buildDefaultWardsForDistrict = (district) => {
  const cleanName = district
    .replace(/^(TP\.|Thị xã|Huyện|Quận)\s+/i, '')
    .trim();

  if (/^TP\./i.test(district)) {
    return ['Phường 1', 'Phường 2', 'Phường 3', 'Phường Trung Tâm', `Phường ${cleanName}`];
  }
  if (/^Thị xã/i.test(district)) {
    return [`Phường ${cleanName}`, 'Phường Trung Tâm', 'Phường 1', 'Phường 2'];
  }
  return [`Thị trấn ${cleanName}`, `Xã Trung Tâm (${cleanName})`];
};

const buildCompleteWardsMap = () => {
  const result = {};
  for (const [city, districts] of Object.entries(VN_DISTRICTS_BY_CITY)) {
    for (const district of districts) {
      const key = `${city}|${district}`;
      const explicit = EXPLICIT_WARDS_BY_DISTRICT[key];
      result[key] = explicit && explicit.length > 0 ? explicit : buildDefaultWardsForDistrict(district);
    }
  }
  return result;
};

export const VN_CITY_ALIASES = {
  'TP.HCM': ['tp hcm', 'tphcm', 'tp ho chi minh', 'ho chi minh', 'sai gon'],
  'Hà Nội': ['ha noi', 'hanoi'],
  'Thừa Thiên Huế': ['thua thien hue', 'thanh pho hue', 'tp hue'],
  'Khánh Hòa': ['khanh hoa', 'nha trang'],
  'Lâm Đồng': ['lam dong', 'da lat'],
  'Bà Rịa - Vũng Tàu': ['ba ria vung tau', 'vung tau', 'ba ria'],
  'Quảng Ninh': ['quang ninh', 'ha long'],
  'Đắk Lắk': ['dak lak', 'dac lac', 'buon ma thuot'],
  'Bình Định': ['binh dinh', 'quy nhon'],
  'Kiên Giang': ['kien giang', 'rach gia', 'phu quoc'],
  'Bình Thuận': ['binh thuan', 'phan thiet'],
  'Tiền Giang': ['tien giang', 'my tho'],
  'An Giang': ['an giang', 'long xuyen'],
  'Nghệ An': ['nghe an', 'tp vinh'],
};

const sortCitiesWithPriority = (cities) =>
  [...cities].sort((a, b) => {
    const idxA = PRIORITY_VN_CITIES.indexOf(a);
    const idxB = PRIORITY_VN_CITIES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'vi');
  });

export const DEFAULT_VN_LOCATIONS = {
  cities: sortCitiesWithPriority(Object.keys(VN_DISTRICTS_BY_CITY)),
  districtsByCity: VN_DISTRICTS_BY_CITY,
  wardsByDistrict: buildCompleteWardsMap(),
};
