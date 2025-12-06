import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import supabase from '../lib/supabase';
import { 
  FiArrowLeft, 
  FiSave, 
  FiImage, 
  FiAlertTriangle, 
  FiCheck,
  FiTrash2
} from 'react-icons/fi';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  // State
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState([]);
  
  // Fetch product data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
    fetchCategories();
  }, [id]);
  
  // Fetch product from Supabase
  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        throw new Error('Produk tidak ditemukan');
      }
      
      setProduct(data);
      setImagePreview(data.image_url);
    } catch (error) {
      console.error('Error fetching product:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);
        
      if (error) throw error;
      
      // Get unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert price and stock to numbers
    if (name === 'price' || name === 'stock') {
      const numValue = value === '' ? '' : Number(value);
      setProduct(prev => ({ ...prev, [name]: numValue }));
    } else {
      setProduct(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Upload image to Supabase Storage
  const uploadImage = async () => {
    if (!imageFile) return null;
    
    try {
      // Generate unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      
      // Upload file
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          },
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };
  
  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaveLoading(true);
      setError(null);
      setSuccess(false);
      
      // Validate form
      if (!product.name) {
        throw new Error('Nama produk harus diisi');
      }
      
      if (!product.price) {
        throw new Error('Harga produk harus diisi');
      }
      
      // Upload image if selected
      let imageUrl = product.image_url;
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      // Prepare product data
      const productData = {
        ...product,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      };
      
      // Create or update product
      let result;
      if (isEditMode) {
        // Update product
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);
      } else {
        // Create product
        productData.created_at = new Date().toISOString();
        result = await supabase
          .from('products')
          .insert(productData);
      }
      
      if (result.error) throw result.error;
      
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/products');
      }, 2000);
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message);
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setProduct(prev => ({ ...prev, image_url: '' }));
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <Link 
          to="/products"
          className="inline-flex items-center text-sm text-primary hover:text-primary-dark mb-2"
        >
          <FiArrowLeft className="mr-1" />
          Kembali ke Daftar Produk
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h1>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <FiAlertTriangle className="text-red-500 mr-3" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex items-center">
            <FiCheck className="text-green-500 mr-3" />
            <p className="text-sm text-green-700">
              Produk berhasil {isEditMode ? 'diperbarui' : 'ditambahkan'}
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Informasi Produk</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column */}
              <div>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={product.name}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={product.description || ''}
                    onChange={handleChange}
                    className="form-input h-32"
                    rows="4"
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label htmlFor="category" className="form-label">
                    Kategori
                  </label>
                  <div className="flex">
                    <select
                      id="category"
                      name="category"
                      value={product.category || ''}
                      onChange={handleChange}
                      className="form-input"
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="price" className="form-label">
                      Harga <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={product.price}
                      onChange={handleChange}
                      className="form-input"
                      min="0"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="stock" className="form-label">
                      Stok
                    </label>
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      value={product.stock || ''}
                      onChange={handleChange}
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              {/* Right column */}
              <div>
                <div className="form-group">
                  <label className="form-label">
                    Gambar Produk
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    {imagePreview ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="mx-auto h-64 w-auto object-contain"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => document.getElementById('file-upload').click()}
                            className="btn btn-outline"
                          >
                            Ganti Gambar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <FiImage className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                          >
                            <span>Upload gambar</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">atau drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Upload progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 text-right">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="btn btn-outline mr-2"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveLoading}
            >
              {saveLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-dark mr-2"></div>
                  <span>Menyimpan...</span>
                </div>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;