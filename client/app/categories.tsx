import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { Category } from '../types';
import CustomAlert from '../components/CustomAlert';
import { useThemeColors } from '../hooks/useThemeColors';

// Solar Icons imports
import {
  AltArrowLeft,
  AddCircle,
} from '@solar-icons/react-native/Bold';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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

  // Bottom Sheet Slide Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  const openBottomSheet = () => {
    setIsAdding(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      resetForm();
    });
  };

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
          closeBottomSheet();
          fetchCategories();
          triggerAlert('Success', 'Category updated successfully!', 'success');
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
          closeBottomSheet();
          fetchCategories();
          triggerAlert('Success', 'New Category added successfully!', 'success');
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
    openBottomSheet();
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Categories</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openBottomSheet}
        >
          <AddCircle size={22} color="#059669" />
        </TouchableOpacity>
      </View>

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
          {/* EXPENSE CATEGORIES */}
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
                    <FontAwesome name="edit" size={15} color="#059669" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteCategory(cat)}>
                    <FontAwesome name="trash" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* INCOME CATEGORIES */}
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
                    <FontAwesome name="edit" size={15} color="#059669" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteCategory(cat)}>
                    <FontAwesome name="trash" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Slide-from-bottom Category Form Drawer Sheet */}
      <Modal
        visible={isAdding}
        transparent
        animationType="fade"
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={closeBottomSheet}
          />
          <Animated.View
            style={[
              styles.sheetContent,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Grabber indicator */}
            <View style={[styles.sheetGrabber, { backgroundColor: colors.border }]} />

            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Edit Custom Category' : 'Create Custom Category'}
            </Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
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
                    style={[
                      styles.typeBtn,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      type === 'expense' && styles.typeBtnActiveExpense,
                    ]}
                    onPress={() => setType('expense')}
                  >
                    <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
                      Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      type === 'income' && styles.typeBtnActiveIncome,
                    ]}
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
                <TouchableOpacity style={styles.cancelBtn} onPress={closeBottomSheet}>
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  catEmoji: {
    fontSize: 20,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  sheetGrabber: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
