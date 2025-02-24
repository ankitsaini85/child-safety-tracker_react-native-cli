// src/screen/ViewAssignedStudents.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Dimensions, 
  ActivityIndicator 
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { DEVICE_IP } from '@env';

interface ScanEvent {
  scanType: string; // e.g., "pickup_home", "dropoff_school", "pickup_school", "dropoff_home"
  cycle: string;    // "morning" or "evening"
  timestamp: string; // ISO string
  success: boolean;
}

interface Student {
  _id: string;
  name: string;
  studentId: string;
  email: string;
  class: string;
  route: string;
  busNumber: string;
  photo: string; // complete data URI (e.g., data:image/png;base64,...)
  scans: ScanEvent[];
}

interface RouteParams {
  busNumber: string;
}

const ViewAssignedStudents: React.FC = () => {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { busNumber = '' } = route.params || {};

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Polling to fetch student data every 5 seconds
  useEffect(() => {
    if (!busNumber) {
      setLoading(false);
      return;
    }
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${DEVICE_IP}/students/${busNumber}`);
        if (response.ok) {
          const data = await response.json();
          setStudents(data);
        } else {
          console.error('Error fetching students:', response.status);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch and then every 5 seconds
    fetchStudents();
    const intervalId = setInterval(fetchStudents, 5000);
    return () => clearInterval(intervalId);
  }, [busNumber]);

  // Helper: Check if a given date string is today.
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  // Helper: Capitalize the first letter of a word.
  const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

  // Helper: Get individual scan status for a specific scan type.
  const getScanStatusForType = (scans: ScanEvent[], expectedType: string) => {
    // Filter today's scans matching the expected scanType exactly.
    const todaysScans = scans.filter(scan => scan.scanType === expectedType && isToday(scan.timestamp));
    if (todaysScans.length === 0) {
      if (expectedType === 'pickup_home') {
         return { status: 'Morning Pickup Absent', color: 'red' };
      } else if (expectedType === 'dropoff_school') {
         return { status: 'Morning Drop-off Not Scanned', color: '#555' };
      } else if (expectedType === 'pickup_school') {
         return { status: 'Evening Pickup Not Scanned', color: '#555' };
      } else if (expectedType === 'dropoff_home') {
         return { status: 'Evening Drop-off Not Scanned', color: '#555' };
      } else {
         return { status: 'Not Scanned', color: '#555' };
      }
    }
    todaysScans.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest = todaysScans[0];
    if (latest.success) {
      if (expectedType === 'pickup_home') {
         return { status: 'Morning Pickup Scan Done', color: 'green' };
      } else if (expectedType === 'dropoff_school') {
         return { status: 'Morning Drop-off Scan Done', color: 'green' };
      } else if (expectedType === 'pickup_school') {
         return { status: 'Evening Pickup Scan Done', color: 'green' };
      } else if (expectedType === 'dropoff_home') {
         return { status: 'Evening Drop-off Scan Done', color: 'green' };
      }
    } else {
      if (expectedType === 'pickup_home') {
         return { status: 'Morning Pickup Absent', color: 'red' };
      } else if (expectedType === 'dropoff_school') {
         return { status: 'Morning Drop-off Absent', color: 'red' };
      } else if (expectedType === 'pickup_school') {
         return { status: 'Evening Pickup Absent', color: 'red' };
      } else if (expectedType === 'dropoff_home') {
         return { status: 'Evening Drop-off Absent', color: 'red' };
      }
    }
    return { status: 'Not Scanned', color: '#555' };
  };

  // Render student card including individual scan statuses and overall latest scan info
  const renderStudentCard = ({ item }: { item: Student }) => {
    // Get statuses for all four scan types.
    const morningPickupStatus = getScanStatusForType(item.scans, 'pickup_home');
    const morningDropOffStatus = getScanStatusForType(item.scans, 'dropoff_school');
    const eveningPickupStatus = getScanStatusForType(item.scans, 'pickup_school');
    const eveningDropOffStatus = getScanStatusForType(item.scans, 'dropoff_home');

    // Calculate overall latest scan (from all scans)
    let overallDate = "No Scan";
    let overallTime = "No Scan";
    if (item.scans && item.scans.length > 0) {
      const sortedAllScans = [...item.scans].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestScan = sortedAllScans[0];
      const dateObj = new Date(latestScan.timestamp);
      overallDate = dateObj.toLocaleDateString();
      overallTime = dateObj.toLocaleTimeString();
    }

    return (
      <View style={styles.card}>
        <Image 
          source={{ uri: item.photo }} 
          style={styles.photo} 
        />
        <View style={styles.details}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.info}>ID: {item.studentId}</Text>
          <Text style={styles.info}>Class: {item.class}</Text>
          <Text style={styles.info}>Route: {item.route}</Text>
          <Text style={styles.info}>Scan Status Date: {overallDate}</Text>
          <Text style={styles.info}>Last Scan Time: {overallTime}</Text>
          <View style={styles.scanStatusContainer}>
            <Text style={[styles.scanStatusText, { color: morningPickupStatus.color }]}>
              {morningPickupStatus.status}
            </Text>
            <Text style={[styles.scanStatusText, { color: morningDropOffStatus.color }]}>
              {morningDropOffStatus.status}
            </Text>
            <Text style={[styles.scanStatusText, { color: eveningPickupStatus.color }]}>
              {eveningPickupStatus.status}
            </Text>
            <Text style={[styles.scanStatusText, { color: eveningDropOffStatus.color }]}>
              {eveningDropOffStatus.status}
            </Text>
          </View>
          {/* Overall latest scan info */}
          
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#673ab7" />
      </View>
    );
  }

  if (!busNumber) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No bus number is fetched.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {students.length === 0 ? (
        <Text style={styles.noStudentsText}>No students assigned.</Text>
      ) : (
        <FlatList 
          data={students}
          keyExtractor={(item) => item._id}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default ViewAssignedStudents;

const { width } = Dimensions.get('window');
const cardWidth = width * 0.9;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 20,
  },
  listContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
  noStudentsText: {
    fontSize: 18,
    color: '#555',
    marginTop: 40,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginVertical: 10,
    flexDirection: 'row',
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  photo: {
    width: 120,
    height: 140,
    borderRadius: 20,
    marginTop: 34,

  },
  details: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
  },
  scanStatusContainer: {
    marginTop: 8,
  },
  scanStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
