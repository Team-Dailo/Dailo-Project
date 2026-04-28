import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  clearNotificationHistory,
  getNotificationHistory,
  NotificationRecord,
} from '../services/notificationHistory.service';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes().toString().padStart(2, '0');
  const ampm = hour < 12 ? '오전' : '오후';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${month}/${day} ${ampm} ${h}:${minute}`;
}

export default function NotificationHistoryScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<NotificationRecord[]>([]);

  const load = useCallback(async () => {
    const data = await getNotificationHistory();
    setRecords(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClear = async () => {
    await clearNotificationHistory();
    setRecords([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>알림 기록</Text>
        {records.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>전체삭제</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => router.push('/notification-settings' as any)}
          style={styles.settingsBtn}
        >
          <Ionicons name="settings-outline" size={22} color="#555" />
        </TouchableOpacity>
      </View>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>받은 알림이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemIcon}>
                <Ionicons name="notifications-outline" size={20} color="#FF6B35" />
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemBody2} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.itemDate}>{formatDate(item.receivedAt)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#222' },
  clearBtn: { padding: 4, marginRight: 8 },
  clearText: { fontSize: 13, color: '#999' },
  settingsBtn: { padding: 4 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 15, color: '#aaa' },
  list: { paddingVertical: 8 },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemIcon: {
    marginTop: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 3 },
  itemBody2: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  itemDate: { fontSize: 12, color: '#aaa' },
});
