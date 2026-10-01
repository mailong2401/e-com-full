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
import { productService, Product, ProductQuery, PaginationMode } from '@/lib/products';

const CATEGORIES = ['Tất cả', 'Điện thoại', 'Laptop', 'Phụ kiện', 'Thời trang', 'Khác'];

const SORT_OPTIONS: {
  value: string;
  label: string;
  requiresOffset?: boolean;
}[] = [
    { value: 'createdAt-DESC', label: 'Mới nhất' },
    { value: 'createdAt-ASC', label: 'Cũ nhất' },
    { value: 'price-ASC', label: 'Giá tăng dần', requiresOffset: true },
    { value: 'price-DESC', label: 'Giá giảm dần', requiresOffset: true },
    { value: 'rating-DESC', label: 'Đánh giá cao', requiresOffset: true },
    { value: 'name-ASC', label: 'Tên A-Z', requiresOffset: true },
  ];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [sort, setSort] = useState('createdAt-DESC');

  // Pagination state
  const [mode, setMode] = useState<PaginationMode>('cursor');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const requestId = useRef(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Tự động chuyển mode khi sort yêu cầu offset
  useEffect(() => {
    const opt = SORT_OPTIONS.find((o) => o.value === sort);
    if (opt?.requiresOffset && mode !== 'offset') {
      setMode('offset');
      setPage(1);
    }
  }, [sort, mode]);

  const fetchProducts = useCallback(
    async (cursor?: string) => {
      const id = ++requestId.current;
      const [sortBy, order] = sort.split('-') as [
        ProductQuery['sortBy'],
        'ASC' | 'DESC',
      ];
      const baseQuery = {
        search: search || undefined,
        category: category === 'Tất cả' ? undefined : category,
        sortBy,
        order,
      };

      try {
        if (mode === 'cursor') {
          const isLoadMore = !!cursor;
          isLoadMore ? setLoadingMore(true) : setLoading(true);

          const res = await productService.listCursor({
            ...baseQuery,
            cursor,
            limit: 12,
          });
          if (id !== requestId.current) return;

          setProducts((prev) =>
            isLoadMore ? [...prev, ...res.data] : res.data,
          );
          setNextCursor(res.meta.nextCursor);
          setHasNextPage(res.meta.hasNextPage);
        } else {
          setLoading(true);
          const res = await productService.listOffset({
            ...baseQuery,
            page,
            limit: 12,
          });
          if (id !== requestId.current) return;

          setProducts(res.data);
          setTotalPages(res.meta.totalPages);
        }
      } catch (err) {
        if (id !== requestId.current) return;
        console.error(err);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [search, category, sort, mode, page],
  );

  // Fetch khi filter / mode / page đổi
  useEffect(() => {
    if (mode === 'cursor') {
      // Reset cursor khi filter đổi
      setProducts([]);
      setNextCursor(null);
      setHasNextPage(false);
      fetchProducts();
    } else {
      fetchProducts();
    }
  }, [fetchProducts, mode]);

  const handleLoadMore = () => {
    if (mode === 'cursor' && nextCursor && hasNextPage && !loadingMore) {
      fetchProducts(nextCursor);
    }
  };

  return (
    <Container size="4" px="4" py="6">
      <Heading size="7" mb="5">Sản phẩm</Heading>

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

          <Select.Root
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <Select.Trigger placeholder="Danh mục" style={{ minWidth: 160 }} />
            <Select.Content>
              {CATEGORIES.map((c) => (
                <Select.Item key={c} value={c}>{c}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Select.Root
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              setPage(1);
            }}
          >
            <Select.Trigger placeholder="Sắp xếp" style={{ minWidth: 160 }} />
            <Select.Content>
              {SORT_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          {/* Toggle mode — chỉ hiện khi sort hỗ trợ cursor */}
          {!SORT_OPTIONS.find((o) => o.value === sort)?.requiresOffset && (
            <Button
              variant="soft"
              size="2"
              onClick={() => {
                setMode(mode === 'cursor' ? 'offset' : 'cursor');
                setPage(1);
              }}
            >
              {mode === 'cursor' ? 'Dạng trang' : 'Dạng cuộn'}
            </Button>
          )}
        </Flex>
      </Card>

      {loading ? (
        <Flex justify="center" py="9"><Spinner size="3" /></Flex>
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

          {/* Cursor mode → Load more */}
          {mode === 'cursor' && hasNextPage && (
            <Flex justify="center">
              <Button
                size="3"
                variant="soft"
                disabled={loadingMore}
                onClick={handleLoadMore}
              >
                {loadingMore ? 'Đang tải...' : 'Tải thêm'}
              </Button>
            </Flex>
          )}

          {/* Offset mode → Prev / Next + số trang */}
          {mode === 'offset' && (
            <Flex justify="center" align="center" gap="3">
              <Button
                variant="soft"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              <Text size="2">Trang {page} / {totalPages}</Text>
              <Button
                variant="soft"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </Flex>
          )}
        </>
      )}
    </Container>
  );
}
