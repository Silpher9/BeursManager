import { StyleSheet, Text, View } from 'react-native';

import { type Contact } from '@/src/domains/contacts/types';
import { Card } from '@/src/shared/components/Card';
import { ChoiceChip } from '@/src/shared/components/ChoiceChip';
import { Field } from '@/src/shared/components/Field';
import { palette } from '@/src/shared/theme/colors';

type SaleContactCardProps = {
  contacts: Contact[];
  selectedContactId: string;
  newContactName: string;
  newContactEmail: string;
  newContactPhone: string;
  selectedContact: Contact | null;
  selectedContactHint?: string | null;
  noContactLabel?: string;
  nameLabel: string;
  bodyText?: string;
  onSelectNoContact: () => void;
  onSelectExistingContact: (contactId: string) => void;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePhone: (value: string) => void;
};

export function SaleContactCard({
  contacts,
  selectedContactId,
  newContactName,
  newContactEmail,
  newContactPhone,
  selectedContact,
  selectedContactHint,
  noContactLabel = 'Geen contact',
  nameLabel,
  bodyText,
  onSelectNoContact,
  onSelectExistingContact,
  onChangeName,
  onChangeEmail,
  onChangePhone,
}: SaleContactCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Koper / contact</Text>
      {bodyText ? <Text style={styles.body}>{bodyText}</Text> : null}
      <View style={styles.choiceRow}>
        <ChoiceChip
          label={noContactLabel}
          active={!selectedContactId && !newContactName.trim()}
          onPress={onSelectNoContact}
        />
        {contacts.map((contact) => (
          <ChoiceChip
            key={contact.id}
            label={contact.name}
            active={selectedContactId === contact.id}
            onPress={() => onSelectExistingContact(contact.id)}
          />
        ))}
      </View>
      {selectedContact && selectedContactHint ? (
        <Text style={styles.hintText}>{selectedContactHint}</Text>
      ) : null}
      <Field
        label={nameLabel}
        placeholder="Naam koper"
        value={newContactName}
        onChangeText={onChangeName}
      />
      <Field
        label="E-mail koper"
        placeholder="koper@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={newContactEmail}
        onChangeText={onChangeEmail}
      />
      <Field
        label="Telefoon koper"
        placeholder="+31 6 12345678"
        keyboardType="phone-pad"
        value={newContactPhone}
        onChangeText={onChangePhone}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
});
