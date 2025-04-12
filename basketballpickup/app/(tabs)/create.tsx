import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

export default function CreateGame() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [format, setFormat] = useState('3v3');
  const [skill, setSkill] = useState('Beginner');

  // Handle date selection and dismiss picker
  const onChangeDate = (_event: any, selectedDate?: Date) => {
    setShowPicker(false); // Dismiss the picker after selecting
    if (selectedDate) {
      setDate(selectedDate); // Update the selected date
    }
  };

  // Handle the submit action
  const handleSubmit = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return Alert.alert('You must be logged in.');

      const playersNeeded = parseInt(format.split('v')[0]) * 2;

      await addDoc(collection(db, 'games'), {
        hostId: user.uid,
        dateTime: date.toISOString(),
        playersNeeded,
        format,
        skillLevel: skill,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Game created!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error creating game');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Choose Game Time</Text>
      <Button title={date.toLocaleString()} onPress={() => setShowPicker(true)} />

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate} // Make sure onChange is set properly
        />
      )}

      <Text style={styles.label}>Game Format</Text>
      <Picker selectedValue={format} onValueChange={(val) => setFormat(val)}>
        <Picker.Item label="3v3" value="3v3" />
        <Picker.Item label="4v4" value="4v4" />
        <Picker.Item label="5v5" value="5v5" />
      </Picker>

      <Text style={styles.label}>Skill Level</Text>
      <Picker selectedValue={skill} onValueChange={(val) => setSkill(val)}>
        <Picker.Item label="Beginner" value="Beginner" />
        <Picker.Item label="Intermediate" value="Intermediate" />
        <Picker.Item label="Experienced" value="Experienced" />
        <Picker.Item label="Pro" value="Pro" />
      </Picker>

      <Button title="Create Game" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
});
