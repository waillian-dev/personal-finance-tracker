import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface CustomAlertProps {
  visible: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  severity?: 'success' | 'warning' | 'danger' | 'info';
}

export default function CustomAlert({
  visible,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
  severity = 'info',
}: CustomAlertProps) {

  const getSeverityColor = () => {
    switch (severity) {
      case 'success':
        return { color: '#10B981', icon: 'check-circle' };
      case 'warning':
        return { color: '#F59E0B', icon: 'exclamation-triangle' };
      case 'danger':
        return { color: '#EF4444', icon: 'times-circle' };
      default:
        return { color: '#2563EB', icon: 'info-circle' };
    }
  };

  const sev = getSeverityColor();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.alertCard}>
          {/* Severity Icon Banner */}
          <View style={[styles.iconCircle, { backgroundColor: `${sev.color}15` }]}>
            <FontAwesome name={sev.icon as any} size={28} color={sev.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            {type === 'confirm' ? (
              <>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: sev.color }]}
                  onPress={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                >
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.alertBtn, { backgroundColor: sev.color }]}
                onPress={onClose}
              >
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBtn: {
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontFamily: 'System',
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14,
  },
  confirmBtnText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
