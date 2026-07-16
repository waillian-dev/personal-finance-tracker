import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { Category } from '../types';
import CustomAlert from '../components/CustomAlert';
import { useThemeColors } from '../hooks/useThemeColors';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];
const EMOJIS = ['📁', '🍔', '🛒', '🚗', '🎬', '🏠', '👕', '🏥', '🎓', '💼', '💰', '🎁', '✈️', '🔧', '🍕', '💡'];

export default function CategoriesScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Alert/Confirmation Dialog States
  const [alertDialog, setAlertDialog] = useState({
    visible: false,
    type: 'alert' as 'alert' | 'confirm',
    title: '',
    message: '',
    severity: 'info' as 'success' | 'warning' | 'danger' | 'info',
    onConfirm: () => {},
  });

  const triggerAlert = (title: string, message: string, severity: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setAlertDialog({
      visible: true,
      type: 'alert',
      title,
      message,
      severity,
      onConfirm: () => {},
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertDialog({
      visible: true,
      type: 'confirm',
      title,
      message,
      severity: 'danger',
      onConfirm,
    });
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveCategory = async () => {
    if (!name.trim()) {
      triggerAlert('Validation Error', 'Category name is required', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Update Custom Category
        const response = await api.put(`/categories/${editingId}`, {
          name: name.trim(),
          type,
          color: selectedColor,
          emoji: selectedEmoji,
        });

        if (response.data.success) {
          triggerAlert('Success', 'Category updated successfully!', 'success');
          resetForm();
          fetchCategories();
        }
      } else {
        // Create Custom Category
        const response = await api.post('/categories', {
          name: name.trim(),
          type,
          color: selectedColor,
          emoji: selectedEmoji,
        });

        if (response.data.success) {
          triggerAlert('Success', 'New Category added successfully!', 'success');
          resetForm();
          fetchCategories();
        }
      }
    } catch (err: any) {
      triggerAlert('Submission Error', err.response?.data?.error || 'Failed to save category', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    if (!cat.userId) {
      triggerAlert('Protected', 'System default categories cannot be modified', 'info');
      return;
    }
    setEditingId(cat._id);
    setName(cat.name);
    setType(cat.type);
    setSelectedColor(cat.color || COLORS[0]);
    setSelectedEmoji(cat.emoji || EMOJIS[0]);
    setIsAdding(true);
  };

  const handleDeleteCategory = (cat: Category) => {
    if (!cat.userId) {
      triggerAlert('Protected', 'System default categories cannot be deleted', 'info');
      return;
    }

    triggerConfirm(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? Transactions using this category will still exist but default category icons will be loaded.`,
      async () => {
        try {
          const res = await api.delete(`/categories/${cat._id}`);
          if (res.data.success) {
            fetchCategories();
          }
        } catch (err) {
          triggerAlert('Error', 'Failed to delete category', 'danger');
        }
      }
    );
  };

  const resetForm = () => {
    setName('');
    setType('expense');
    setSelectedColor(COLORS[0]);
    setSelectedEmoji(EMOJIS[0]);
    setEditingId(null);
    setIsAdding(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Categories</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (isAdding) resetForm();
            else setIsAdding(true);
          }}
        >
          <FontAwesome name={isAdding ? 'times' : 'plus'} size={18} color="#059669" />
        </TouchableOpacity>
      </View>

      {/* Custom alert modal overlay */}
      <CustomAlert
        visible={alertDialog.visible}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        severity={alertDialog.severity}
        onClose={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
        onConfirm={alertDialog.onConfirm}
      />

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* CATEGORY FORM CARD (Add / Edit) */}
          {isAdding && (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editingId ? 'Edit Custom Category' : 'Create Custom Category'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Shopping, Utilities"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category Flow Type</Text>
                <View style={styles.typeGrid}>
                  <TouchableOpacity
                    style={[styles.typeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, type === 'expense' && styles.typeBtnActiveExpense]}
                    onPress={() => setType('expense')}
                  >
                    <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
                      Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, type === 'income' && styles.typeBtnActiveIncome]}
                    onPress={() => setType('income')}
                  >
                    <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Select Theme Color</Text>
                <View style={styles.colorGrid}>
                  {COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorCircleActive,
                      ]}
                      onPress={() => setSelectedColor(c)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Select Emoji Icon</Text>
                <View style={styles.emojiGrid}>
                  {EMOJIS.map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={[
                        styles.emojiCard,
                        { backgroundColor: colors.inputBg, borderColor: colors.border },
                        selectedEmoji === e && styles.emojiCardActive,
                      ]}
                      onPress={() => setSelectedEmoji(e)}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveCategory}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Category</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* LIST OF CATEGORIES */}
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Expense Categories</Text>
          {categories.filter(c => c.type === 'expense').map((cat) => (
            <View key={cat._id} style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.catInfo}>
                <View style={[styles.catIconWrapper, { backgroundColor: cat.color ? `${cat.color}15` : (isDark ? '#334155' : '#F1F5F9') }]}>
                  <Text style={styles.catEmoji}>{cat.emoji || '📁'}</Text>
                </View>
                <View>
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.catMeta, { color: colors.textSecondary }]}>
                    {cat.userId ? 'Custom' : 'System Default'}
                  </Text>
                </View>
              </View>
              
              {cat.userId && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => handleStartEdit(cat)}>
                    <FontAwesome name="edit" size={16} color="#059669" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteCategory(cat)}>
                    <FontAwesome name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginTop: 24 }]}>Income Categories</Text>
          {categories.filter(c => c.type === 'income').map((cat) => (
            <View key={cat._id} style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.catInfo}>
                <View style={[styles.catIconWrapper, { backgroundColor: cat.color ? `${cat.color}15` : (isDark ? '#334155' : '#F1F5F9') }]}>
                  <Text style={styles.catEmoji}>{cat.emoji || '💰'}</Text>
                </View>
                <View>
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.catMeta, { color: colors.textSecondary }]}>
                    {cat.userId ? 'Custom' : 'System Default'}
                  </Text>
                </View>
              </View>

              {cat.userId && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => handleStartEdit(cat)}>
                    <FontAwesome name="edit" size={16} color="#059669" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteCategory(cat)}>
                    <FontAwesome name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    fontFamily: 'System',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActiveExpense: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  typeBtnText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#0F172A',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCard: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiCardActive: {
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontFamily: 'System',
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionSubtitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  catMeta: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
