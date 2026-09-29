// ecom-fe/app/(dashboard)/dashboard/products/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heading,
  Table,
  Button,
  Flex,
  Card,
  Text,
  Badge,
  TextField,
  IconButton,
} from '@radix-ui/themes';
import { PlusIcon, MagnifyingGlassIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { api } from '@/lib/api';

// Định nghĩa kiểu dữ liệu cho Product (dựa trên backend)
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'draft' | 'active' | 'inactive' | 'out_of_stock';
  category: string;
  createdAt: string;
}

interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // giá trị ô nhập
  const [search, setSearch] = useState(''); // giá trị đã debounce dùng để gọi API
  const requestId = useRef(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedProducts>('/products', {
        params: { search: search || undefined, page, limit: 10 },
      });
      if (id !== requestId.current) return; // bỏ kết quả của request cũ
      setProducts(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (error) {
      if (id !== requestId.current) return;
      console.error('Failed to fetch products', error);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [search, page]);

  // Debounce ô tìm kiếm: không gọi API mỗi lần gõ phím
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts(); // Tải lại danh sách
    } catch (error) {
      console.error('Failed to delete product', error);
      alert('Xóa sản phẩm thất bại.');
    }
  };

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="center">
        <Heading size="6">Quản lý Sản phẩm</Heading>
        <Button>
          <PlusIcon /> Thêm sản phẩm
        </Button>
      </Flex>

      <Card>
        <Flex p="4" justify="between">
          <TextField.Root
            placeholder="Tìm kiếm sản phẩm..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: '300px' }}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </Flex>
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Tên sản phẩm</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Danh mục</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Giá</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Tồn kho</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Trạng thái</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Hành động</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading ? (
              <Table.Row>
                <Table.Cell colSpan={6} align="center">Đang tải...</Table.Cell>
              </Table.Row>
            ) : products.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} align="center">Không có sản phẩm nào.</Table.Cell>
              </Table.Row>
            ) : (
              products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>{product.name}</Table.Cell>
                  <Table.Cell>{product.category}</Table.Cell>
                  <Table.Cell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</Table.Cell>
                  <Table.Cell>{product.stock}</Table.Cell>
                  <Table.Cell>
                    <Badge color={product.status === 'active' ? 'green' : product.status === 'draft' ? 'gray' : 'red'}>
                      {product.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="2">
                      <IconButton variant="soft" color="gray">
                        <Pencil1Icon />
                      </IconButton>
                      <IconButton variant="soft" color="red" onClick={() => handleDelete(product.id)}>
                        <TrashIcon />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
        <Flex justify="center" align="center" gap="3" p="4">
          <Button
            variant="soft"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <Text size="2">
            Trang {page} / {totalPages}
          </Text>
          <Button
            variant="soft"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
