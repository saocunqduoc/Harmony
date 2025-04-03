module.exports = (sequelize, DataTypes) => {
  const BookingAssignedStaff = sequelize.define(
    "BookingAssignedStaff",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "bookings",
          key: "id",
        },
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "booking_assigned_staff",
      timestamps: false,
    },
  )

  return BookingAssignedStaff
}

