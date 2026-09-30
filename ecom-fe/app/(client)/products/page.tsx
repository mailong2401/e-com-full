// ecom-fe/app/(client)/products/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Flex,
  Grid,
  Heading,
  TextField,
  Select,
  Button,
  Card,
  Text,
  Spinner,
  Box,
} from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { ProductCard } from '@/components/product-card';
import {
  productService,
  Product,
  ProductQuery,
} from '@/lib/products';

const CATEGORIES = ['Tất cả', 'Điện thoại', 'Laptop', 'Phụ kiện', 'Thời trang', 'Khác'];

const SORT_OPTIONS = [
  { value: 'createdAt-DESC', label: 'Mới nhất' },
  { value: 'price-ASC', label: 'Giá tăng dần' },
  { value: 'price-DESC', label: 'Giá giảm dần' },
  { value: 'rating-DESC', label: 'Đánh giá cao' },
  { value: 'name-ASC', label: 'Tên A-Z' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [sort, setSort] = useState('createdAt-DESC');

  const requestId = useRef(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchProducts = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const [sortBy, order] = sort.split('-') as [
        ProductQuery['sortBy'],
        'ASC' | 'DESC',
      ];
      const res = await productService.list({
        search: search || undefined,
        category: category === 'Tất cả' ? undefined : category,
        sortBy,
        order,
        page,
        limit: 12,
      });
      if (id !== requestId.current) return;
      setProducts(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [search, category, sort, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  return (
    <Container size="4" px="4" py="6">
      <Heading size="7" mb="5">
        Sản phẩm
      </Heading>

      {/* Filters */}
      <Card size="2" mb="5">
        <Flex gap="3" wrap="wrap" align="center">
          <Box style={{ flex: 1, minWidth: 240 }}>
            <TextField.Root
              placeholder="Tìm kiếm sản phẩm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
            </TextField.Root>
          </Box>

          <Select.Root value={category} onValueChange={handleCategoryChange}>
            <Select.Trigger placeholder="Danh mục" style={{ minWidth: 160 }} />
            <Select.Content>
              {CATEGORIES.map((c) => (
                <Select.Item key={c} value={c}>
                  {c}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Select.Root value={sort} onValueChange={handleSortChange}>
            <Select.Trigger placeholder="Sắp xếp" style={{ minWidth: 160 }} />
            <Select.Content>
              {SORT_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      {/* Grid */}
      {loading ? (
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      ) : products.length === 0 ? (
        <Card size="3" style={{ padding: '60px 20px' }}>
          <Flex direction="column" align="center" gap="2">
            <Text color="gray">Không tìm thấy sản phẩm nào</Text>
          </Flex>
        </Card>
      ) : (
        <>
          <Grid columns={{ initial: '2', sm: '3', md: '4' }} gap="4" mb="6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Grid>

          {/* Pagination */}
          <Flex justify="center" align="center" gap="3">
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
        </>
      )}
    </Container>
  );
}
