module.exports = (sequelize, DataTypes) => {
  const ServiceCategory = sequelize.define(
    "ServiceCategory",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
    },
    {
      tableName: "service_categories",
      timestamps: false,
    },
  )

  return ServiceCategory
}

