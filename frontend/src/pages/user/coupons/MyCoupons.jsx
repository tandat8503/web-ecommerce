import { useState, useEffect } from 'react';
import { getUserCoupons } from '../../../api/coupons';
import { Ticket, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('available'); // available, used, expired

    useEffect(() => {
        fetchCoupons();
    }, [activeTab]);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const response = await getUserCoupons({ status: activeTab });
            setCoupons(response.data.data);
        } catch (error) {
            toast.error('Lỗi khi tải mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('vi-VN');
    };

    const formatDiscount = (coupon) => {
        if (coupon.discountType === 'PERCENT') {
            return `${coupon.discountValue}%`;
        }
        return `${Number(coupon.discountValue).toLocaleString('vi-VN')}đ`;
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Đã copy mã giảm giá');
    };

    const tabs = [
        { id: 'available', label: 'Có thể dùng', icon: Ticket },
        { id: 'used', label: 'Đã dùng', icon: CheckCircle },
        { id: 'expired', label: 'Hết hạn', icon: XCircle }
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Mã Giảm Giá Của Tôi</h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Coupons List */}
            {loading ? (
                <div className="text-center py-20">Đang tải...</div>
            ) : coupons.length === 0 ? (
                <div className="text-center py-20">
                    <Ticket size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">Không có mã giảm giá nào</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map((userCoupon) => {
                        const coupon = userCoupon.coupon;
                        const isExpired = new Date(userCoupon.expiresAt) < new Date();
                        const isUsed = userCoupon.isUsed;

                        return (
                            <div
                                key={userCoupon.id}
                                className={`border rounded-lg overflow-hidden ${isUsed || isExpired ? 'opacity-60' : 'hover:shadow-lg transition-shadow'
                                    }`}
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Ticket size={24} />
                                        {isUsed && (
                                            <span className="bg-green-500 text-xs px-2 py-1 rounded">
                                                Đã sử dụng
                                            </span>
                                        )}
                                        {isExpired && !isUsed && (
                                            <span className="bg-red-500 text-xs px-2 py-1 rounded">
                                                Hết hạn
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold mb-1">
                                        {formatDiscount(coupon)}
                                    </div>
                                    <div className="text-sm opacity-90">{coupon.name}</div>
                                </div>

                                {/* Body */}
                                <div className="p-4">
                                    <div className="mb-4">
                                        <div className="text-sm text-gray-600 mb-2">
                                            {coupon.description}
                                        </div>
                                        {coupon.minimumAmount > 0 && (
                                            <div className="text-sm text-gray-600">
                                                Đơn tối thiểu: {Number(coupon.minimumAmount).toLocaleString('vi-VN')}đ
                                            </div>
                                        )}
                                    </div>

                                    {/* Code */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 bg-gray-100 p-3 rounded">
                                            <code className="flex-1 font-mono font-bold text-blue-600">
                                                {coupon.code}
                                            </code>
                                            <button
                                                onClick={() => copyCode(coupon.code)}
                                                className="text-sm text-blue-600 hover:underline"
                                                disabled={isUsed || isExpired}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expiry */}
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>
                                            HSD: {formatDate(userCoupon.expiresAt)}
                                        </span>
                                    </div>

                                    {/* Use Button */}
                                    {!isUsed && !isExpired && (
                                        <button
                                            onClick={() => {
                                                copyCode(coupon.code);
                                                window.location.href = '/cart';
                                            }}
                                            className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                                        >
                                            Dùng Ngay
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
