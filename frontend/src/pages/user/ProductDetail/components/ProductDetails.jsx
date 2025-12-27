import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Separator } from '../../../../components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '../../../../components/ui/table';
import { useProductDetailContext } from '../ProductDetailContext';

/**
 * Component hiển thị thông tin chi tiết sản phẩm và variant đã chọn dưới dạng UI
 * - Lấy data từ Context, không cần nhận props
 * 
 * Chức năng:
 * - Hiển thị thông tin cơ bản sản phẩm (tên, brand, category, SKU, status...)
 * - Hiển thị thông tin variant được chọn (nếu có)
 * - Hiển thị mô tả sản phẩm (nếu có)
 * - Hiển thị thông tin SEO (nếu có)
 */
const ProductDetails = () => {
  // ============================================
  // LẤY DATA TỪ CONTEXT - Không cần nhận props
  // ============================================
  const { product, selectedVariant } = useProductDetailContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">📋 Thông tin chi tiết sản phẩm</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-8">
        {/* Thông tin cơ bản sản phẩm */}
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="text-gray-600 font-medium w-1/3">Tên sản phẩm</TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-gray-600 font-medium">Thương hiệu</TableCell>
              <TableCell>{product.brand?.name || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-gray-600 font-medium">Danh mục</TableCell>
              <TableCell>{product.category?.name || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-gray-600 font-medium">Đường dẫn</TableCell>
              <TableCell>{product.slug || 'N/A'}</TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell className="text-gray-600 font-medium">Trạng thái</TableCell>
              <TableCell>
                <Badge variant={product.status === 'ACTIVE' ? "default" : "destructive"}>
                  {product.status === 'ACTIVE' ? 'Đang bán' : 
                   product.status === 'INACTIVE' ? 'Ngừng bán' : 'Hết hàng'}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-gray-600 font-medium">Sản phẩm nổi bật</TableCell>
              <TableCell>{product.isFeatured ? '⭐ Có' : ' Không'}</TableCell>
            </TableRow>
            {/* <TableRow>
              <TableCell className="text-gray-600 font-medium">Lượt xem</TableCell>
              <TableCell>{product.viewCount || 0} lượt</TableCell>
            </TableRow> */}
            <TableRow>
              <TableCell className="text-gray-600 font-medium">Ngày tạo</TableCell>
              <TableCell>{new Date(product.createdAt).toLocaleDateString('vi-VN')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Thông tin variant được chọn - Chỉ hiển thị nếu có variant được chọn */}
        {selectedVariant && (
          <>
            <Separator />
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                🎨 Thông tin biến thể đã chọn
              </h4>
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <Table>
                    <TableBody>
                      {selectedVariant.color && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium w-1/3">Màu sắc</TableCell>
                          <TableCell>{selectedVariant.color}</TableCell>
                        </TableRow>
                      )}
                      {(selectedVariant.width || selectedVariant.depth || selectedVariant.height) && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium">Kích thước</TableCell>
                          <TableCell>
                            {selectedVariant.width && selectedVariant.depth && selectedVariant.height
                              ? `${selectedVariant.width}×${selectedVariant.depth}×${selectedVariant.height}mm`
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      )}
                      {selectedVariant.material && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium">Vật liệu</TableCell>
                          <TableCell>{selectedVariant.material}</TableCell>
                        </TableRow>
                      )}
                      {selectedVariant.warranty && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium">Bảo hành</TableCell>
                          <TableCell>{selectedVariant.warranty}</TableCell>
                        </TableRow>
                      )}
                      {selectedVariant.weightCapacity && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium">Tải trọng</TableCell>
                          <TableCell>{selectedVariant.weightCapacity}kg</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Ghi chú kích thước */}
                  {selectedVariant.dimensionNote && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <span className="text-gray-600 text-base block mb-1">Ghi chú kích thước:</span>
                        <span className="text-gray-700 text-sm">{selectedVariant.dimensionNote}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Mô tả chi tiết sản phẩm - Chỉ hiển thị nếu có mô tả */}
        {product.description && (
          <>
            <Separator />
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                📝 Mô tả sản phẩm
              </h4>
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed text-base">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Thông tin SEO - Chỉ hiển thị nếu có metaTitle hoặc metaDescription */}
        {(product.metaTitle || product.metaDescription) && (
          <>
            <Separator />
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                🔍 Thông tin SEO
              </h4>
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <Table>
                    <TableBody>
                      {product.metaTitle && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium w-1/3 align-top pt-3">
                            Meta Title
                          </TableCell>
                          <TableCell className="pt-3">
                            <p className="text-gray-700">{product.metaTitle}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {product.metaDescription && (
                        <TableRow>
                          <TableCell className="text-gray-600 font-medium align-top pt-3">
                            Meta Description
                          </TableCell>
                          <TableCell className="pt-3">
                            <p className="text-gray-700">{product.metaDescription}</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductDetails;
